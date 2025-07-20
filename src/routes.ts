import { Router } from "express";
import { handleDelete, handleGet, handlePost } from "./route-handlers.js";

const router = Router();

router.post("/", handlePost);
router.get("/", handleGet);
router.delete("/", handleDelete);

export default router;
