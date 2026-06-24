const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(__dirname));

// MongoDB Connection
const dbURI = "mongodb+srv://sukurali8244_db_user:OSkpvbFmqVLmSvGP@cluster0.dkje2pn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(dbURI)
    .then(() => {
        console.log("MongoDB से जुड़ गए भाई!");
        createMaster(); 
    })
    .catch(err => console.error("Database Error:", err));

// User Schema (पासवर्ड फील्ड ऐड कर दिया)
const UserSchema = new mongoose.Schema({
    userId: { type: Number, unique: true },
    mobile: { type: String, unique: true },
    password: { type: String }, 
    role: { type: String, default: 'Member' },
    balance: { type: Number, default: 0 }
});
const User = mongoose.model('User', UserSchema);

// Master ID Setup (बिल्कुल वैसा ही जैसा तूने मांगा था)
async function createMaster() {
    const masterExists = await User.findOne({ userId: 1 });
    if (!masterExists) {
        await User.create({ userId: 1, mobile: "7628950634", password: "admin", role: 'Master' });
    }
}

// --- Routes ---

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));

// 3. Login Logic (पासवर्ड मैचिंग के साथ)
app.post('/login', async (req, res) => {
    const { mobile, password } = req.body;
    try {
        const user = await User.findOne({ mobile: mobile, password: password });
        if (user) {
            res.json({ success: true, userId: user.userId, role: user.role });
        } else {
            res.json({ success: false, message: "Invalid Mobile or Password!" });
        }
    } catch (err) {
        res.json({ success: false, message: "Error!" });
    }
});

// 4. Registration (पासवर्ड सेव करने के साथ)
app.post('/register', async (req, res) => {
    const { mobile, password, referralCode } = req.body;
    const MASTER_MOBILE = "7628950634";
    
    try {
        const lastUser = await User.findOne().sort({ userId: -1 });
        const newId = lastUser ? lastUser.userId + 1 : 2;
        
        let role = (referralCode === MASTER_MOBILE) ? 'TL' : 'Member';
        
        await User.create({ userId: newId, mobile: mobile, password: password, role: role });
        res.json({ success: true, userId: newId });
    } catch (err) {
        res.json({ success: false, message: "Already registered!" });
    }
});

// 5. Deposit
app.post('/deposit', async (req, res) => {
    const { userId, amount } = req.body;
    await User.updateOne({ userId: userId }, { $inc: { balance: amount } });
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server port ${PORT} par chal raha hai`));