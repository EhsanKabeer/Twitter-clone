import { getAdminDb } from "./server-config";
import { User } from "@/types";

// Server-side Firestore operations using Admin SDK
export const getUserServer = async (userId: string): Promise<User | null> => {
  try {
    const userDoc = await getAdminDb().collection("users").doc(userId).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      return {
        ...data,
        id: userDoc.id,
        createdAt: data?.createdAt?.toDate() || new Date(),
      } as User;
    }
    return null;
  } catch (error) {
    console.error("Error getting user (server):", error);
    return null;
  }
};

export const createUserServer = async (userData: Omit<User, "createdAt">): Promise<void> => {
  try {
    await getAdminDb().collection("users").doc(userData.id).set({
      ...userData,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Error creating user (server):", error);
    throw error;
  }
};

