const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // यह जरूरी है फाइल दिखाने के लिए

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection
const dbURI = "mongodb+srv://sukurali8244_db_user:OSkpvbFmqVLmSvGP@cluster0.dkje2pn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(dbURI)
    .then(() => {
        console.log("MongoDB से जुड़ गए भाई!");
        createMaster(); 
    })
    .catch(err => console.error("Database Error:", err));

// User Schema
const UserSchema = new mongoose.Schema({
    userId: { type: Number, unique: true },
    mobile: { type: String, unique: true },
    role: { type: String, default: 'Member' },
    status: { type: String, default: 'Enabled' },
    referralBy: Number,
    balance: { type: Number, default: 0 },
    bank: { holderName: String, bankName: String, accNumber: String, ifsc: String },
    rechargeHistory: { type: Array, default: [] },
    tokenHistory: { type: Array, default: [] }
});
const User = mongoose.model('User', UserSchema);

// Master ID Setup
async function createMaster() {
    const masterExists = await User.findOne({ userId: 1 });
    if (!masterExists) {
        await User.create({ userId: 1, mobile: "7628950634", role: 'Master', referralBy: 0 });
    }
}

// --- यहाँ से वेबसाइट का होम पेज (index.html) दिखाने का कोड है ---
app.use(express.static(__dirname)); 

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
// -------------------------------------------------------------

// 1. Registration
app.post('/register', async (req, res) => {
    const { mobile, referralCode } = req.body;
    const MASTER_CODE = "7628950634";
    const lastUser = await User.findOne().sort({ userId: -1 });
    const newId = lastUser ? lastUser.userId + 1 : 2;
    let role = 'Member';
    let referredBy = 1;
    if (referralCode === MASTER_CODE) { role = 'TL'; referredBy = 1; }
    else {
        const tlUser = await User.findOne({ mobile: referralCode });
        if (tlUser) { referredBy = tlUser.userId; }
    }
    try {
        await User.create({ userId: newId, mobile, role, referralBy });
        res.json({ success: true, userId: newId });
    } catch (err) { res.json({ success: false, message: "Already registered!" }); }
});

// 2. बैलेंस अपडेट
app.post('/deposit', async (req, res) => {
    const { userId, amount } = req.body;
    await User.updateOne({ userId: userId }, { $inc: { balance: amount } });
    res.json({ success: true });
});

// 3. बैंक सेव
app.post('/save-bank', async (req, res) => {
    await User.updateOne({ userId: req.body.userId }, { bank: req.body });
    res.json({ success: true });
});

// 4. प्रोफाइल API
app.get('/profile/:userId', async (req, res) => {
    const user = await User.findOne({ userId: req.params.userId });
    if(user) res.json({ success: true, userId: user.userId, balance: user.balance });
    else res.json({ success: false });
});

app.listen(3000, () => console.log("Server port 3000 par chal raha hai"));