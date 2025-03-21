import express from 'express';
import cors from 'cors';
import cookieParser from "cookie-parser";

const app=express();


app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true,

}))

app.use(express.json({
    limit:"16kb"
}))
app.use(express.urlencoded({
    extended:true,
    limit:"16kb"
}))
app.use(express.static("public"))
app.use(cookieParser())
import cronJob from "./controllers/cronjob.controller.js";
cronJob.keepServerAlive();

//routes import

import userRouter from "./routes/user.route.js";
import noticeRouter from "./routes/notice.route.js";
import resourceRoute from "./routes/resource.route.js";


//routes declearation
//user route
app.use("/api/v1/users",userRouter)
app.use("/api/v1/notice",noticeRouter)
app.use("/api/v1/resource",resourceRoute)
export default  app 