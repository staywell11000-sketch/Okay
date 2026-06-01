import { Router } from "express";
import { db } from "@workspace/db";
import { users } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.get("/users/me", requireAuth, async (req: any, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.userId));
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

router.put("/users/me", requireAuth, async (req: any, res) => {
  try {
    // Explicitly whitelist safe fields — never allow role to be set by the user
    const { email, firstName, lastName, title, phone, avatarUrl, onboarded } = req.body;

    const [existing] = await db.select().from(users).where(eq(users.id, req.userId));

    if (existing) {
      const [updated] = await db
        .update(users)
        .set({
          ...(email !== undefined && { email }),
          ...(firstName !== undefined && { firstName }),
          ...(lastName !== undefined && { lastName }),
          ...(title !== undefined && { title }),
          ...(phone !== undefined && { phone }),
          ...(avatarUrl !== undefined && { avatarUrl }),
          ...(onboarded !== undefined && { onboarded }),
          updatedAt: new Date(),
        })
        .where(eq(users.id, req.userId))
        .returning();
      return res.json(updated);
    }

    const [created] = await db
      .insert(users)
      .values({
        id: req.userId,
        email: email || "",
        firstName,
        lastName,
        role: "agent", // always default to agent on creation, never from body
        title,
        phone,
        avatarUrl,
        onboarded: onboarded ?? false,
      })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: "Failed to save user" });
  }
});

export default router;
