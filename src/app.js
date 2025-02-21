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


//routes import

import userRouter from "./routes/user.route.js";
import campSiteRouter from "./routes/campsite.route.js";
import bookingRouter from "./routes/booking.route.js";
import paymentRouter from "./routes/payment.route.js";


//routes declearation
//user route
app.use("/api/v1/users",userRouter)
//camp site route

app.use("/api/v1/campsite",campSiteRouter)

app.use("/api/v1/booking",bookingRouter)

app.use("/api/v1/payment",paymentRouter)
export default  app 