const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const crypto = require('crypto');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// नया MongoDB URI यहाँ है
const dbURI = 'mongodb+srv://rnpay62_db_user:XLx3QQFr3Iztd1jo@cluster0.nrraztn.mongodb.net/?appName=Cluster0';

mongoose.connect(dbURI)
    .then(() => console.log('MongoDB नया वाला कनेक्टेड!'))
    .catch(err => console.log('DB Error:', err));

// 1. यूजर स्कीमा
const userSchema = new mongoose.Schema({
    mobile: { type: String, required: true, unique: true },
    pass: { type: String, required: true },
    referredBy: String,
    myReferralCode: { type: String, unique: true, required: true },
    userID: { type: String, unique: true, required: true },
    status: { type: String, default: "ON" },
    walletBalance: { type: Number, default: 0 },
    sellingLimit: { type: Number, default: 50000 },
    commission: { type: Number, default: 0 },
    totalRecharge: { type: Number, default: 0 },
    bankDetails: {
        accountNo: { type: String, default: null },
        ifsc: { type: String, default: null },
        bankName: { type: String, default: null },
        holderName: { type: String, default: null },
        bankStatus: { type: String, default: "ON" }
    }
});
const User = mongoose.model('User', userSchema);

// 2. पेमेंट स्कीमा
const paymentSchema = new mongoose.Schema({
    requestID: { type: String, unique: true, required: true },
    userID: { type: String, required: true },
    sellerID: { type: String, required: true },
    mobile: { type: String, required: true },
    amount: { type: Number, required: true },
    utr: { type: String, required: true, unique: true },
    proofImage: { type: String, required: true },
    status: { type: String, default: "PENDING" },
    createdAt: { type: Date, default: Date.now }
});
const Payment = mongoose.model('Payment', paymentSchema);

// --- APIs ---
app.get('/api/p2p/fetch-account', async (req, res) => {
    try {
        const requestedAmount = parseInt(req.query.amount);
        if (!requestedAmount || requestedAmount < 200) {
            return res.status(400).json({ success: false, message: "न्यूनतम लेनदेन राशि ₹200 है!" });
        }
        const eligibleSeller = await User.findOne({
            status: "ON",
            walletBalance: { $gte: requestedAmount },
            "bankDetails.bankStatus": "ON",
            "bankDetails.accountNo": { $ne: null }
        });
        if (!eligibleSeller || (eligibleSeller.walletBalance - requestedAmount) < 200) {
            return res.status(404).json({ success: false, message: "इस राशि के लिए फिलहाल कोई एक्टिव अकाउंट उपलब्ध नहीं है!" });
        }
        res.json({
            success: true,
            sellerID: eligibleSeller.userID,
            bankDetails: {
                accountNo: eligibleSeller.bankDetails.accountNo,
                bankName: eligibleSeller.bankDetails.bankName,
                ifsc: eligibleSeller.bankDetails.ifsc,
                holderName: eligibleSeller.bankDetails.holderName
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "मैचिंग इंजन एरर" });
    }
});

app.post('/api/submit-deposit', async (req, res) => {
    try {
        const uniqueReqID = "REQ" + crypto.randomBytes(4).toString('hex').toUpperCase();
        const paymentData = {
            requestID: uniqueReqID,
            userID: req.body.userID,
            sellerID: req.body.sellerID,
            mobile: req.body.mobile,
            amount: parseInt(req.body.amount),
            utr: req.body.utr,
            proofImage: req.body.proofImage
        };
        const newPayment = new Payment(paymentData);
        await newPayment.save();
        res.json({ success: true, message: "डिपॉजिट रिक्वेस्ट सबमिट हो गई है! एजेंट जांच कर रहा है।" });
    } catch (err) {
        res.status(500).json({ success: false, message: "डिपॉजिट सबमिट नहीं हुआ या UTR पहले से मौजूद है!" });
    }
});

app.get('/api/my-payments', async (req, res) => {
    try {
        const payments = await Payment.find({ userID: req.query.userID }).sort({ createdAt: -1 });
        res.json({ success: true, payments });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/team', (req, res) => res.sendFile(path.join(__dirname, 'team.html')));
app.get('/regist', (req, res) => res.sendFile(path.join(__dirname, 'register.html')));
app.get('/admin-panel', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

app.post('/api/register', async (req, res) => {
    try {
        const { mobile, pass, referral } = req.body;
        const existingUser = await User.findOne({ mobile: mobile });
        if (existingUser) return res.status(400).json({ success: false, message: "यह नंबर पहले से रजिस्टर्ड है!" });
        const uniqueID = "ID" + crypto.randomBytes(4).toString('hex').toUpperCase();
        const uniqueRefCode = "REF" + crypto.randomBytes(3).toString('hex').toUpperCase();
        const newUser = new User({ mobile, pass, referredBy: referral || null, myReferralCode: uniqueRefCode, userID: uniqueID, walletBalance: 10000 });
        await newUser.save();
        res.json({ success: true, userID: uniqueID, myReferralCode: uniqueRefCode, message: "रजिस्ट्रेशन एकदम टकाटक हो गया!" });
    } catch (err) { res.status(500).json({ success: false, message: "सर्वर एरर" }); }
});

app.post('/api/login', async (req, res) => {
    try {
        const { mobile, pass } = req.body;
        const user = await User.findOne({ mobile: mobile });
        if (!user || user.pass !== pass) return res.status(400).json({ success: false, message: "गलत विवरण!" });
        if (user.status === "OFF") return res.status(403).json({ success: false, message: "आईडी सस्पेंड है!" });
        res.json({ success: true, userID: user.userID, myReferralCode: user.myReferralCode, message: "लॉगिन सफल!" });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.get('/api/team-details', async (req, res) => {
    try {
        const { refCode } = req.query;
        const members = await User.find({ referredBy: refCode });
        res.json({ success: true, teamMembers: members });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.get('/api/admin/dashboard-data', async (req, res) => {
    try {
        const search = req.query.search || "";
        let userQuery = {};
        let paymentQuery = {};
        if(search) {
            userQuery = { $or: [ { userID: { $regex: search, $options: 'i' } }, { mobile: { $regex: search, $options: 'i' } }, { "bankDetails.accountNo": { $regex: search, $options: 'i' } } ] };
            paymentQuery = { $or: [ { utr: { $regex: search, $options: 'i' } }, { userID: { $regex: search, $options: 'i' } }, { requestID: { $regex: search, $options: 'i' } } ] };
        }
        const users = await User.find(userQuery);
        const payments = await Payment.find(paymentQuery).sort({ createdAt: -1 });
        const totalUsers = await User.countDocuments({});
        const pendingPayments = await Payment.countDocuments({ status: "PENDING" });
        res.json({ success: true, users, payments, stats: { totalUsers, pendingPayments } });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/toggle-id', async (req, res) => { await User.findOneAndUpdate({ userID: req.body.userID }, { status: req.body.status }); res.json({ success: true }); });
app.post('/api/admin/change-pass', async (req, res) => { await User.findOneAndUpdate({ userID: req.body.userID }, { pass: req.body.newPass }); res.json({ success: true }); });
app.post('/api/admin/toggle-bank', async (req, res) => { await User.findOneAndUpdate({ userID: req.body.userID }, { "bankDetails.bankStatus": req.body.bankStatus }); res.json({ success: true }); });
app.post('/api/admin/delete-bank', async (req, res) => { await User.findOneAndUpdate({ userID: req.body.userID }, { "bankDetails.accountNo": null, "bankDetails.ifsc": null, "bankDetails.bankName": null, "bankDetails.holderName": null }); res.json({ success: true }); });
app.post('/api/admin/transfer-bank', async (req, res) => {
    const sourceUser = await User.findOne({ userID: req.body.sourceUserID });
    await User.findOneAndUpdate({ userID: req.body.targetUserID }, { bankDetails: sourceUser.bankDetails });
    sourceUser.bankDetails = { accountNo: null, ifsc: null, bankName: null, holderName: null, bankStatus: "ON" };
    await sourceUser.save();
    res.json({ success: true });
});

app.post('/api/admin/process-payment', async (req, res) => {
    try {
        const { requestID, action } = req.body;
        const payRequest = await Payment.findOne({ requestID: requestID, status: "PENDING" });
        if (!payRequest) return res.status(404).json({ success: false, message: "रिक्वेस्ट नहीं मिली!" });
        if (action === "APPROVED") {
            const seller = await User.findOne({ userID: payRequest.sellerID });
            if (!seller || seller.walletBalance < payRequest.amount) return res.status(400).json({ success: false, message: "सेलर के पास पर्याप्त बैलेंस नहीं है!" });
            seller.walletBalance -= payRequest.amount;
            await seller.save();
            await User.findOneAndUpdate({ userID: payRequest.userID }, { $inc: { walletBalance: payRequest.amount, totalRecharge: payRequest.amount } });
            payRequest.status = "APPROVED";
        } else { payRequest.status = "CANCELLED"; }
        await payRequest.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});