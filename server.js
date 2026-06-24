const express = require('express');
const mongoose = require('mongoose');
const app = express();
app.use(express.json());
app.use(express.static(__dirname));

// तुम्हारा MongoDB कनेक्शन (पासवर्ड सही से फिट कर दिया है)
const dbURI = 'mongodb+srv://sukurali8244_db_user:OSkpvbFmqVLmSvGP@cluster0.dkje2pn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(dbURI)
    .then(() => console.log("Database connected successfully!"))
    .catch(err => console.log("Connection error:", err));

const User = mongoose.model('User', new mongoose.Schema({
    userId: Number,
    mobile: { type: String, unique: true },
    password: { type: String },
    role: String
}));

app.post('/register', async (req, res) => {
    const { mobile, password } = req.body;
    const MASTER_MOBILE = "7628950634";
    const MASTER_PASS = "plmokn90";

    try {
        let newId;
        let role = 'Member';

        // मास्टर आईडी के लिए लॉजिक
        if (mobile === MASTER_MOBILE && password === MASTER_PASS) {
            newId = 1;
            role = 'Master';
        } else {
            const lastUser = await User.findOne().sort({ userId: -1 });
            newId = (lastUser && lastUser.userId >= 1) ? lastUser.userId + 1 : 2;
        }

        await User.create({ userId: newId, mobile, password, role });
        res.json({ success: true, userId: newId });
    } catch (err) {
        res.json({ success: false, message: "Error: User might already exist!" });
    }
});

app.listen(3000, () => console.log('Server is running on port 3000'));