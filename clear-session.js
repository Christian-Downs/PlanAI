// Quick script to help clear NextAuth session issues
// Run this with: node clear-session.js

console.log("🔧 PlanAI Session Troubleshooting");
console.log("=====================================");
console.log("");
console.log("If you're getting JWT decryption errors, follow these steps:");
console.log("");
console.log("1. 🛑 STOP your dev server (Ctrl+C)");
console.log("");
console.log("2. 🧹 Clear browser data:");
console.log("   • Open DevTools (F12)");
console.log("   • Go to Application/Storage tab");
console.log("   • Clear Cookies, Local Storage, Session Storage for localhost:3000");
console.log("   • OR use an incognito/private browser window");
console.log("");
console.log("3. 🚀 Restart your dev server:");
console.log("   npm run dev");
console.log("");
console.log("4. ✅ Test login again at http://localhost:3000");
console.log("");
console.log("The JWT errors happen when the NEXTAUTH_SECRET changes but old");
console.log("encrypted tokens remain in the browser. Clearing them fixes this.");
console.log("");