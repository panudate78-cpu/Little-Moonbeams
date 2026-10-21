import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

// ---------- Users & Auth ----------
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().default("customer"), // customer | admin
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Catalogue ----------
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 140 }).notNull().unique(),
  description: text("description"),
});

export const collections = pgTable("collections", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 140 }).notNull().unique(),
  description: text("description"),
  image: text("image"),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 220 }).notNull().unique(),
  sku: varchar("sku", { length: 64 }).notNull().default(""),
  description: text("description").notNull().default(""),
  materials: text("materials").notNull().default(""),
  stoneInfo: text("stone_info").notNull().default(""),
  careInstructions: text("care_instructions").notNull().default(""),
  // prices stored in pence (GBP)
  price: integer("price").notNull(),
  salePrice: integer("sale_price"),
  stock: integer("stock").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(3),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active | draft | archived
  featured: boolean("featured").notNull().default(false),
  isNew: boolean("is_new").notNull().default(false),
  isBestseller: boolean("is_bestseller").notNull().default(false),
  categoryId: integer("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  collectionId: integer("collection_id").references(() => collections.id, {
    onDelete: "set null",
  }),
  metaTitle: varchar("meta_title", { length: 200 }),
  metaDescription: text("meta_description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const productImages = pgTable("product_images", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  alt: varchar("alt", { length: 200 }).notNull().default(""),
  position: integer("position").notNull().default(0),
});

// ---------- Orders ----------
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number", { length: 40 }).notNull().unique(),
  userId: integer("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 40 }).notNull().default(""),
  address1: varchar("address1", { length: 255 }).notNull(),
  address2: varchar("address2", { length: 255 }).notNull().default(""),
  city: varchar("city", { length: 120 }).notNull(),
  postcode: varchar("postcode", { length: 20 }).notNull(),
  country: varchar("country", { length: 80 }).notNull().default("United Kingdom"),
  subtotal: integer("subtotal").notNull(),
  discount: integer("discount").notNull().default(0),
  discountCode: varchar("discount_code", { length: 64 }),
  shipping: integer("shipping").notNull().default(0),
  tax: integer("tax").notNull().default(0),
  total: integer("total").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("paid"), // pending | paid | shipped | delivered | cancelled
  paymentMethod: varchar("payment_method", { length: 40 }).notNull().default("card"),
  trackingNumber: varchar("tracking_number", { length: 80 }).notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  name: varchar("name", { length: 200 }).notNull(),
  price: integer("price").notNull(),
  quantity: integer("quantity").notNull(),
  image: text("image").notNull().default(""),
});

// ---------- Reviews ----------
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id, {
    onDelete: "cascade",
  }),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  name: varchar("name", { length: 120 }).notNull(),
  rating: integer("rating").notNull(),
  title: varchar("title", { length: 160 }).notNull().default(""),
  comment: text("comment").notNull(),
  approved: boolean("approved").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Discounts ----------
export const discountCodes = pgTable("discount_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  type: varchar("type", { length: 20 }).notNull().default("percent"), // percent | fixed
  value: integer("value").notNull(), // percent (e.g. 10) or pence
  minSubtotal: integer("min_subtotal").notNull().default(0),
  active: boolean("active").notNull().default(true),
  usageLimit: integer("usage_limit"),
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Inventory ----------
export const inventoryLogs = pgTable("inventory_logs", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  change: integer("change").notNull(),
  reason: varchar("reason", { length: 160 }).notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Marketing ----------
export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 30 }).notNull().default("contact"), // contact | custom-order
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 200 }).notNull().default(""),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductImage = typeof productImages.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Collection = typeof collections.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type DiscountCode = typeof discountCodes.$inferSelect;
