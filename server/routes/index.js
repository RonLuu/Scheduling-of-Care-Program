import { Router } from "express";
import organizationsRouter from "./organization.js";
import usersRouter from "./user.js";
import personWithNeedsRouter from "./personWithNeeds.js";
import personUserLinkRouter from "./personUserLink.js";
import tokenRouter from "./token.js";
import careNeedItemRouter from "./careNeedItem.js";
import careTaskRouter from "./careTask.js";
import commentRouter from "./comment.js";
import fileUploadRouter from "./fileUpload.js";
import schedulingRouter from "./scheduling.js";
import authRouter from "./auth.js";
import reportsRouter from "./reports.js";
import userMeRouter from "./users.me.js";
import accessRequestRouter from "./accessRequest.js";

const router = Router();

router.use("/auth", authRouter);
router.use("/organizations", organizationsRouter);
router.use("/users", usersRouter);
router.use("/users", userMeRouter);
router.use("/person-with-needs", personWithNeedsRouter);
router.use("/person-user-links", personUserLinkRouter);
router.use("/tokens", tokenRouter);
router.use("/care-need-items", careNeedItemRouter);
router.use("/care-tasks", careTaskRouter);
router.use("/comments", commentRouter);
router.use("/file-upload", fileUploadRouter);
router.use("/scheduling", schedulingRouter);
router.use("/reports", reportsRouter);
router.use("/access-requests", accessRequestRouter);

export default router;
