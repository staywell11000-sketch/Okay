import { Router } from "express";
import { db } from "@workspace/db";
import { properties } from "@workspace/db/schema";
import { eq, ilike, and, or, desc, asc, count, gte, lte, SQL } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.get("/properties", requireAuth, async (req: any, res) => {
  const userId: string = req.userId;
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;
    const type = req.query.type as string | undefined;
    const city = req.query.city as string | undefined;
    const dealerId = req.query.dealerId as string | undefined;
    const minPrice = req.query.minPrice as string | undefined;
    const maxPrice = req.query.maxPrice as string | undefined;
    const sort = (req.query.sort as string) || "newest";

    const conditions: SQL[] = [eq(properties.listedById, userId)];
    if (search) {
      conditions.push(
        or(
          ilike(properties.title, `%${search}%`),
          ilike(properties.address, `%${search}%`),
          ilike(properties.city, `%${search}%`),
          ilike(properties.sector ?? "", `%${search}%`),
          ilike(properties.mlsNumber ?? "", `%${search}%`),
        )!,
      );
    }
    if (status && status !== "all") {
      conditions.push(eq(properties.status, status));
    }
    if (type && type !== "all") {
      conditions.push(eq(properties.type, type));
    }
    if (city) {
      conditions.push(ilike(properties.city, `%${city}%`));
    }
    if (dealerId && dealerId !== "all") {
      conditions.push(eq(properties.dealerId, Number(dealerId)));
    }
    if (minPrice) {
      conditions.push(gte(properties.price, minPrice));
    }
    if (maxPrice) {
      conditions.push(lte(properties.price, maxPrice));
    }

    const where = and(...conditions);

    const orderBy =
      sort === "price_asc" ? asc(properties.price)
      : sort === "price_desc" ? desc(properties.price)
      : sort === "oldest" ? asc(properties.createdAt)
      : desc(properties.createdAt);

    const [rows, totalResult] = await Promise.all([
      db.select().from(properties).where(where).orderBy(orderBy)
        .limit(pageSize).offset((page - 1) * pageSize),
      db.select({ count: count() }).from(properties).where(where),
    ]);

    const total = Number(totalResult[0]?.count ?? 0);
    res.json({
      data: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list properties" });
  }
});

router.post("/properties", requireAuth, async (req, res) => {
  try {
    const body = req.body;
    const [row] = await db.insert(properties).values({
      title: body.title,
      description: body.description,
      address: body.address || "",
      city: body.city || "",
      state: body.state || "Punjab",
      zipCode: body.zipCode,
      country: body.country ?? "PK",
      type: body.type ?? "house",
      subtype: body.subtype,
      status: body.status ?? "available",
      price: body.price,
      bedrooms: body.bedrooms,
      bathrooms: body.bathrooms,
      sqft: body.sqft,
      sizeMarla: body.sizeMarla,
      sector: body.sector,
      lotSize: body.lotSize,
      yearBuilt: body.yearBuilt,
      parkingSpaces: body.parkingSpaces,
      images: body.images ?? [],
      amenities: body.amenities ?? [],
      tags: body.tags ?? [],
      mlsNumber: body.mlsNumber,
      metadata: body.metadata,
      dealerId: body.dealerId ? Number(body.dealerId) : null,
      agentId: body.agentId || null,
      listedById: (req as any).userId ?? undefined,
      updatedAt: new Date(),
    }).returning();
    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create property" });
  }
});

router.get("/properties/:id", requireAuth, async (req: any, res) => {
  try {
    const id = Number(req.params.id);
    const userId: string = req.userId;
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const [row] = await db.select().from(properties)
      .where(and(eq(properties.id, id), eq(properties.listedById, userId)))
      .limit(1);

    if (!row) return res.status(404).json({ error: "Property not found" });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get property" });
  }
});

router.put("/properties/:id", requireAuth, async (req: any, res) => {
  try {
    const id = Number(req.params.id);
    const userId: string = req.userId;
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const body = req.body;
    const [row] = await db.update(properties).set({
      title: body.title,
      description: body.description,
      address: body.address,
      city: body.city,
      state: body.state,
      zipCode: body.zipCode,
      country: body.country,
      type: body.type,
      subtype: body.subtype,
      status: body.status,
      price: body.price,
      bedrooms: body.bedrooms,
      bathrooms: body.bathrooms,
      sqft: body.sqft,
      sizeMarla: body.sizeMarla,
      sector: body.sector,
      lotSize: body.lotSize,
      yearBuilt: body.yearBuilt,
      parkingSpaces: body.parkingSpaces,
      images: body.images,
      amenities: body.amenities,
      tags: body.tags,
      mlsNumber: body.mlsNumber,
      metadata: body.metadata,
      dealerId: body.dealerId ? Number(body.dealerId) : null,
      agentId: body.agentId || null,
      updatedAt: new Date(),
    }).where(and(eq(properties.id, id), eq(properties.listedById, userId))).returning();

    if (!row) return res.status(404).json({ error: "Property not found" });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update property" });
  }
});

router.patch("/properties/:id/status", requireAuth, async (req: any, res) => {
  try {
    const id = Number(req.params.id);
    const userId: string = req.userId;
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "status required" });

    const [row] = await db.update(properties)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(properties.id, id), eq(properties.listedById, userId)))
      .returning();

    if (!row) return res.status(404).json({ error: "Property not found" });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

router.delete("/properties/:id", requireAuth, async (req: any, res) => {
  try {
    const id = Number(req.params.id);
    const userId: string = req.userId;
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    await db.delete(properties).where(and(eq(properties.id, id), eq(properties.listedById, userId)));
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete property" });
  }
});

export default router;
