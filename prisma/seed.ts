import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seeding...");

  const warehousesData = [
    {
      name: "Bangalore Fulfillment Center",
      location: "Electronic City, Bengaluru",
    },
    {
      name: "Mumbai Distribution Hub",
      location: "Navi Mumbai, Maharashtra",
    },
    {
      name: "Delhi NCR Warehouse",
      location: "Gurugram, Haryana",
    },
  ];

  const productsData = [
    {
      name: "MacBook Air M3",
      sku: "LAP-001",
      description:
        "13-inch Apple laptop powered by the M3 chip with all-day battery life.",
      imageUrl:
        "https://images.unsplash.com/photo-1517336714739-489689fd1ca8?w=800",
    },
    {
      name: "Lenovo ThinkPad X1 Carbon",
      sku: "LAP-002",
      description:
        "Premium business ultrabook designed for performance and portability.",
      imageUrl:
        "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800",
    },
    {
      name: "Dell UltraSharp 27-inch 4K Monitor",
      sku: "MON-003",
      description:
        "Professional-grade 4K monitor for productivity and content creation.",
      imageUrl:
        "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800",
    },
    {
      name: "Samsonite Laptop Backpack",
      sku: "BAG-004",
      description:
        "Durable travel backpack with dedicated laptop compartment and organizer.",
      imageUrl:
        "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800",
    },
    {
      name: "Sony WH-1000XM5 Headphones",
      sku: "AUD-005",
      description: "Industry-leading wireless noise-cancelling headphones.",
      imageUrl:
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800",
    },
  ];

  await prisma.$transaction(async (tx) => {
    console.log("Cleaning existing data...");

    await tx.reservation.deleteMany();
    await tx.inventory.deleteMany();
    await tx.product.deleteMany();
    await tx.warehouse.deleteMany();

    console.log("Creating warehouses...");

    const warehouses = await Promise.all(
      warehousesData.map((warehouse) =>
        tx.warehouse.create({
          data: warehouse,
        }),
      ),
    );

    console.log("Creating products...");

    const products = await Promise.all(
      productsData.map((product) =>
        tx.product.create({
          data: product,
        }),
      ),
    );

    const bangalore = warehouses.find(
      (warehouse) => warehouse.name === "Bangalore Fulfillment Center",
    )!;

    const mumbai = warehouses.find(
      (warehouse) => warehouse.name === "Mumbai Distribution Hub",
    )!;

    const delhi = warehouses.find(
      (warehouse) => warehouse.name === "Delhi NCR Warehouse",
    )!;

    const macbook = products.find((product) => product.sku === "LAP-001")!;

    const thinkpad = products.find((product) => product.sku === "LAP-002")!;

    const monitor = products.find((product) => product.sku === "MON-003")!;

    const backpack = products.find((product) => product.sku === "BAG-004")!;

    const headphones = products.find((product) => product.sku === "AUD-005")!;

    console.log("Creating inventory records...");

    // MacBook Air M3
    // Concurrency test candidate: only 1 unit available
    await tx.inventory.create({
      data: {
        productId: macbook.id,
        warehouseId: bangalore.id,
        totalUnits: 1,
      },
    });

    await tx.inventory.create({
      data: {
        productId: macbook.id,
        warehouseId: mumbai.id,
        totalUnits: 15,
      },
    });

    await tx.inventory.create({
      data: {
        productId: macbook.id,
        warehouseId: delhi.id,
        totalUnits: 12,
      },
    });

    // Lenovo ThinkPad X1 Carbon
    await tx.inventory.create({
      data: {
        productId: thinkpad.id,
        warehouseId: bangalore.id,
        totalUnits: 10,
      },
    });

    // Concurrency test candidate: only 1 unit available
    await tx.inventory.create({
      data: {
        productId: thinkpad.id,
        warehouseId: mumbai.id,
        totalUnits: 1,
      },
    });

    await tx.inventory.create({
      data: {
        productId: thinkpad.id,
        warehouseId: delhi.id,
        totalUnits: 8,
      },
    });

    // Dell UltraSharp 4K Monitor
    await tx.inventory.create({
      data: {
        productId: monitor.id,
        warehouseId: bangalore.id,
        totalUnits: 5,
      },
    });

    await tx.inventory.create({
      data: {
        productId: monitor.id,
        warehouseId: mumbai.id,
        totalUnits: 7,
      },
    });

    await tx.inventory.create({
      data: {
        productId: monitor.id,
        warehouseId: delhi.id,
        totalUnits: 2,
      },
    });

    // Samsonite Laptop Backpack
    await tx.inventory.create({
      data: {
        productId: backpack.id,
        warehouseId: bangalore.id,
        totalUnits: 25,
      },
    });

    await tx.inventory.create({
      data: {
        productId: backpack.id,
        warehouseId: mumbai.id,
        totalUnits: 30,
      },
    });

    await tx.inventory.create({
      data: {
        productId: backpack.id,
        warehouseId: delhi.id,
        totalUnits: 18,
      },
    });

    // Sony WH-1000XM5 Headphones
    await tx.inventory.create({
      data: {
        productId: headphones.id,
        warehouseId: bangalore.id,
        totalUnits: 4,
      },
    });

    await tx.inventory.create({
      data: {
        productId: headphones.id,
        warehouseId: mumbai.id,
        totalUnits: 20,
      },
    });

    // Concurrency test candidate: only 1 unit available
    await tx.inventory.create({
      data: {
        productId: headphones.id,
        warehouseId: delhi.id,
        totalUnits: 1,
      },
    });

    console.log("Seeding transaction completed successfully.");
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
