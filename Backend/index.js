import dns from 'node:dns/promises';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import app from "./app.js"
import dotenv from "dotenv"
import connectDb from "./db/index.js"

dotenv.config({
    path:"./.env"
})

connectDb()
.then(()=>{
    app.listen(process.env.PORT||5001,()=>{
        console.log(`Server is listening in PORT ${process.env.PORT}`);
    })
})
.catch((err)=>{
     console.log("Some error occured and server is not connected",err);
})