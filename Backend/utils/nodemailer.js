import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config()

let transporter = nodemailer.createTransport({
    service: 'gmail',
    secure:true,
    port:465,
    auth: {
        user: process.env.GMAIL, 
        pass: process.env.GMAIL_PASSWORD, 
    },
});

const sendPasswordResetEmail = async (email, resetLink,resetToken) => {
    try {
        console.log(resetLink)
        let info = await transporter.sendMail({
            from: process.env.GMAIL,
            to: email, 
            subject: 'Password Reset Request',
            text: `You can reset your password using this link: ${resetLink} .Your reset token is ${resetToken}`, 
            html: `<p>You requested to reset your password. Click the link below to reset it:</p>
                   <a href="${resetLink}">Reset Password</a>` 
        });
        
        console.log("Message sent: %s", info.messageId);
    } catch (error) {
        console.error("Error sending email: ", error);
    }
};

export  {sendPasswordResetEmail}