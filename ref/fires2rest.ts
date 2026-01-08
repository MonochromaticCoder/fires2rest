import { config } from "dotenv";
import { FieldValue, Firestore } from "../src/index.js";

config();

const db = new Firestore({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
});

const COLLECTION = "transaction-testing";

// Setup: Create initial documents for the transaction demo
async function setup() {
    const statsRef = db.collection(COLLECTION).doc("stats");
    const userRef = db.collection(COLLECTION).doc("user-alice");
    const inventoryRef = db.collection(COLLECTION).doc("inventory-item-001");

    await statsRef.set({ totalTransactions: 0, lastUpdated: null });
    await userRef.set({ name: "Alice", balance: 100, pendingOrder: null });
    await inventoryRef.set({
        name: "Widget",
        stock: 5,
        price: 25,
        reserved: 0,
    });

    console.log("Setup complete.");
}

// Complex transaction: Purchase flow with multiple reads/writes
async function purchaseItem(userId: string, itemId: string, quantity: number) {
    const userRef = db.collection(COLLECTION).doc(`user-${userId}`);
    const inventoryRef = db.collection(COLLECTION).doc(`inventory-${itemId}`);
    const statsRef = db.collection(COLLECTION).doc("stats");
    const orderRef = db.collection(COLLECTION).doc(); // auto-generated ID

    const result = await db.runTransaction(async (transaction) => {
        // Read phase: get current state of all involved documents
        const [userSnap, inventorySnap, statsSnap] = await Promise.all([
            transaction.get(userRef),
            transaction.get(inventoryRef),
            transaction.get(statsRef),
        ]);

        if (!userSnap.exists || !inventorySnap.exists) {
            throw new Error("User or inventory item not found");
        }

        const user = userSnap.data() as {
            balance: number;
            pendingOrder: string | null;
        };
        const item = inventorySnap.data() as {
            stock: number;
            reserved: number;
            price: number;
        };

        // Business logic validation
        const totalCost = item.price * quantity;
        const availableStock = item.stock - item.reserved;

        if (availableStock < quantity) {
            throw new Error(
                `Insufficient stock: ${availableStock} available, ${quantity} requested`,
            );
        }
        if (user.balance < totalCost) {
            throw new Error(
                `Insufficient balance: ${user.balance} available, ${totalCost} required`,
            );
        }

        // Write phase: atomic updates across all documents
        // 1. Deduct user balance and set pending order
        transaction.update(userRef, {
            balance: FieldValue.increment(-totalCost),
            pendingOrder: orderRef.id,
            lastPurchase: FieldValue.serverTimestamp(),
        });

        // 2. Update inventory: decrease stock, increase reserved
        transaction.update(inventoryRef, {
            stock: FieldValue.increment(-quantity),
            reserved: FieldValue.increment(quantity),
            [`buyers.${userId}`]: FieldValue.increment(quantity), // track per-user purchases
        });

        // 3. Create new order document
        transaction.set(orderRef, {
            userId,
            itemId,
            quantity,
            totalCost,
            status: "pending",
            createdAt: FieldValue.serverTimestamp(),
        });

        // 4. Update global stats (with conditional initialization)
        if (statsSnap.exists) {
            transaction.update(statsRef, {
                totalTransactions: FieldValue.increment(1),
                lastUpdated: FieldValue.serverTimestamp(),
                [`itemsSold.${itemId}`]: FieldValue.increment(quantity),
            });
        } else {
            transaction.set(statsRef, {
                totalTransactions: 1,
                lastUpdated: FieldValue.serverTimestamp(),
                itemsSold: { [itemId]: quantity },
            });
        }

        return {
            orderId: orderRef.id,
            totalCost,
            newBalance: user.balance - totalCost,
        };
    });

    console.log("Purchase successful:", result);
    return result;
}

// Another complex transaction: Fulfill order with cleanup
async function fulfillOrder(orderId: string) {
    const orderRef = db.collection(COLLECTION).doc(orderId);

    await db.runTransaction(async (transaction) => {
        const orderSnap = await transaction.get(orderRef);

        if (!orderSnap.exists) throw new Error("Order not found");

        const order = orderSnap.data()!;
        if (order.status !== "pending")
            throw new Error(`Invalid order status: ${order.status}`);

        const userRef = db.collection(COLLECTION).doc(`user-${order.userId}`);
        const inventoryRef = db
            .collection(COLLECTION)
            .doc(`inventory-${order.itemId}`);

        // Clear pending order from user, release reserved inventory
        transaction.update(userRef, { pendingOrder: FieldValue.delete() });
        transaction.update(inventoryRef, {
            reserved: FieldValue.increment(-order.quantity),
        });
        transaction.update(orderRef, {
            status: "fulfilled",
            fulfilledAt: FieldValue.serverTimestamp(),
        });
    });

    console.log(`Order ${orderId} fulfilled.`);
}

async function main() {
    await setup();

    // Execute purchase transaction
    const { orderId } = await purchaseItem("alice", "item-001", 2);

    // Fulfill the order
    await fulfillOrder(orderId);

    console.log("All transactions completed successfully.");
}

main().catch(console.error);
