import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Helper internal mutation to actually clear and insert
export const clearAndSeed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allFoods = await ctx.db.query("foods").collect();
    for (const food of allFoods) {
      await ctx.db.delete(food._id);
    }
    
    for (const food of indianFoods) {
      await ctx.db.insert("foods", food);
    }
  }
});

export const run = action({
  args: {},
  handler: async (ctx) => {
    await ctx.runMutation(internal.seedFoods.clearAndSeed, {});
    return { status: "success", message: `Inserted ${indianFoods.length} Indian foods.` };
  }
});

const indianFoods = [
  // Protein
  { name: "Paneer Tikka", cals: 260, protein: 18, carbs: 8, fat: 16, emoji: "🧀", cat: "Protein" },
  { name: "Chicken Tikka", cals: 220, protein: 28, carbs: 5, fat: 9, emoji: "🍗", cat: "Protein" },
  { name: "Tandoori Chicken", cals: 260, protein: 30, carbs: 4, fat: 12, emoji: "🍖", cat: "Protein" },
  { name: "Chana Masala", cals: 280, protein: 12, carbs: 40, fat: 7, emoji: "🍛", cat: "Protein" },
  { name: "Rajma Masala", cals: 290, protein: 14, carbs: 42, fat: 6, emoji: "🍛", cat: "Protein" },
  { name: "Dal Makhani", cals: 320, protein: 12, carbs: 32, fat: 16, emoji: "🍲", cat: "Protein" },
  { name: "Yellow Dal Tadka", cals: 220, protein: 10, carbs: 36, fat: 4, emoji: "🍲", cat: "Protein" },
  { name: "Egg Curry", cals: 210, protein: 14, carbs: 10, fat: 12, emoji: "🥚", cat: "Protein" },
  { name: "Mutton Rogan Josh", cals: 380, protein: 24, carbs: 12, fat: 26, emoji: "🥘", cat: "Protein" },
  { name: "Fish Curry", cals: 240, protein: 22, carbs: 10, fat: 12, emoji: "🐟", cat: "Protein" },
  { name: "Soya Chunks Curry", cals: 210, protein: 24, carbs: 15, fat: 6, emoji: "🥘", cat: "Protein" },
  
  // Carbs
  { name: "Roti / Chapati", cals: 120, protein: 4, carbs: 22, fat: 1, emoji: "🫓", cat: "Carbs" },
  { name: "Naan", cals: 260, protein: 8, carbs: 42, fat: 6, emoji: "🫓", cat: "Carbs" },
  { name: "Garlic Naan", cals: 310, protein: 8, carbs: 45, fat: 10, emoji: "🫓", cat: "Carbs" },
  { name: "Basmati Rice (1 cup)", cals: 200, protein: 4, carbs: 44, fat: 0, emoji: "🍚", cat: "Carbs" },
  { name: "Jeera Rice (1 cup)", cals: 240, protein: 4, carbs: 45, fat: 4, emoji: "🍛", cat: "Carbs" },
  { name: "Chicken Biryani", cals: 480, protein: 22, carbs: 55, fat: 18, emoji: "🍲", cat: "Carbs" },
  { name: "Veg Biryani", cals: 350, protein: 8, carbs: 58, fat: 10, emoji: "🍲", cat: "Carbs" },
  { name: "Poha", cals: 250, protein: 5, carbs: 46, fat: 4, emoji: "🥣", cat: "Carbs" },
  { name: "Idli (2 pcs)", cals: 120, protein: 4, carbs: 24, fat: 0, emoji: "🍘", cat: "Carbs" },
  { name: "Plain Dosa", cals: 160, protein: 4, carbs: 24, fat: 4, emoji: "🥞", cat: "Carbs" },
  { name: "Masala Dosa", cals: 320, protein: 6, carbs: 42, fat: 14, emoji: "🌯", cat: "Carbs" },
  { name: "Upma", cals: 220, protein: 6, carbs: 36, fat: 5, emoji: "🥣", cat: "Carbs" },
  { name: "Aloo Paratha", cals: 290, protein: 6, carbs: 46, fat: 8, emoji: "🫓", cat: "Carbs" },
  { name: "Paneer Paratha", cals: 330, protein: 12, carbs: 42, fat: 12, emoji: "🫓", cat: "Carbs" },
  { name: "Sabudana Khichdi", cals: 310, protein: 3, carbs: 58, fat: 6, emoji: "🍲", cat: "Carbs" },
  { name: "Puri (2 pcs)", cals: 280, protein: 4, carbs: 32, fat: 14, emoji: "🫓", cat: "Carbs" },
  
  // Fats
  { name: "Ghee (1 tbsp)", cals: 120, protein: 0, carbs: 0, fat: 14, emoji: "🧈", cat: "Fats" },
  { name: "Coconut Chutney", cals: 120, protein: 2, carbs: 4, fat: 10, emoji: "🥥", cat: "Fats" },
  { name: "Peanut Chutney", cals: 150, protein: 5, carbs: 6, fat: 12, emoji: "🥜", cat: "Fats" },
  
  // Vegetables
  { name: "Palak Paneer", cals: 320, protein: 16, carbs: 12, fat: 24, emoji: "🥬", cat: "Vegetables" },
  { name: "Aloo Gobi", cals: 180, protein: 4, carbs: 24, fat: 8, emoji: "🥦", cat: "Vegetables" },
  { name: "Bhindi Masala", cals: 160, protein: 4, carbs: 18, fat: 8, emoji: "🍆", cat: "Vegetables" },
  { name: "Baingan Bharta", cals: 140, protein: 3, carbs: 16, fat: 6, emoji: "🍆", cat: "Vegetables" },
  { name: "Mix Veg Curry", cals: 180, protein: 4, carbs: 22, fat: 8, emoji: "🥗", cat: "Vegetables" },
  { name: "Pav Bhaji (No Bread)", cals: 220, protein: 6, carbs: 32, fat: 8, emoji: "🍲", cat: "Vegetables" },
  
  // Snacks
  { name: "Samosa (1 pc)", cals: 260, protein: 4, carbs: 32, fat: 12, emoji: "🥟", cat: "Snacks" },
  { name: "Onion Pakoda", cals: 220, protein: 6, carbs: 24, fat: 10, emoji: "🧆", cat: "Snacks" },
  { name: "Vada Pav", cals: 300, protein: 6, carbs: 44, fat: 10, emoji: "🍔", cat: "Snacks" },
  { name: "Panipuri (6 pcs)", cals: 180, protein: 4, carbs: 30, fat: 5, emoji: "🍲", cat: "Snacks" },
  { name: "Dhokla (3 pcs)", cals: 160, protein: 6, carbs: 28, fat: 2, emoji: "🧽", cat: "Snacks" },
  { name: "Bhel Puri", cals: 190, protein: 4, carbs: 38, fat: 2, emoji: "🥗", cat: "Snacks" },
  { name: "Aloo Tikki (2 pcs)", cals: 220, protein: 4, carbs: 32, fat: 8, emoji: "🥔", cat: "Snacks" },
  { name: "Papdi Chaat", cals: 250, protein: 6, carbs: 36, fat: 8, emoji: "🥗", cat: "Snacks" },
  { name: "Medu Vada (2 pcs)", cals: 280, protein: 6, carbs: 30, fat: 14, emoji: "🍩", cat: "Snacks" },
  
  // Sweets (Mapped to Snacks category as requested)
  { name: "Gulab Jamun (2 pcs)", cals: 300, protein: 4, carbs: 48, fat: 10, emoji: "🍮", cat: "Snacks" },
  { name: "Rasgulla (2 pcs)", cals: 250, protein: 4, carbs: 54, fat: 2, emoji: "🍡", cat: "Snacks" },
  { name: "Jalebi", cals: 320, protein: 2, carbs: 68, fat: 4, emoji: "🥨", cat: "Snacks" },
  { name: "Rice Kheer (1 bowl)", cals: 240, protein: 6, carbs: 36, fat: 8, emoji: "🥣", cat: "Snacks" },
  { name: "Gajar Ka Halwa", cals: 310, protein: 5, carbs: 38, fat: 15, emoji: "🥕", cat: "Snacks" },
  { name: "Ladoo (1 pc)", cals: 220, protein: 3, carbs: 30, fat: 10, emoji: "🟠", cat: "Snacks" },
  { name: "Barfi (1 pc)", cals: 150, protein: 3, carbs: 20, fat: 7, emoji: "🧇", cat: "Snacks" },
  
  // Dairy
  { name: "Sweet Lassi", cals: 220, protein: 6, carbs: 38, fat: 5, emoji: "🥛", cat: "Dairy" },
  { name: "Buttermilk (Chaas)", cals: 60, protein: 3, carbs: 6, fat: 2, emoji: "🥛", cat: "Dairy" },
  { name: "Cucumber Raita", cals: 110, protein: 6, carbs: 12, fat: 4, emoji: "🥣", cat: "Dairy" },
  { name: "Milk (1 glass)", cals: 150, protein: 8, carbs: 12, fat: 8, emoji: "🥛", cat: "Dairy" },
  
  // Drinks
  { name: "Masala Chai", cals: 100, protein: 2, carbs: 14, fat: 4, emoji: "☕", cat: "Drinks" },
  { name: "Filter Coffee", cals: 90, protein: 2, carbs: 12, fat: 4, emoji: "☕", cat: "Drinks" },
  { name: "Sugarcane Juice", cals: 180, protein: 1, carbs: 45, fat: 0, emoji: "🍹", cat: "Drinks" },
  { name: "Jaljeera", cals: 40, protein: 0, carbs: 10, fat: 0, emoji: "🧊", cat: "Drinks" },
  
  // Fruits
  { name: "Mango (1 cup)", cals: 99, protein: 1, carbs: 25, fat: 0, emoji: "🥭", cat: "Fruits" },
  { name: "Papaya (1 cup)", cals: 60, protein: 1, carbs: 15, fat: 0, emoji: "🍈", cat: "Fruits" },
  { name: "Guava (1 pc)", cals: 38, protein: 1, carbs: 8, fat: 0, emoji: "🍈", cat: "Fruits" },
  { name: "Banana (1 pc)", cals: 105, protein: 1, carbs: 27, fat: 0, emoji: "🍌", cat: "Fruits" },
  { name: "Pomegranate (1 cup)", cals: 144, protein: 3, carbs: 33, fat: 2, emoji: "🍎", cat: "Fruits" }
];
