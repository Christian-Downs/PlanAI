@echo off
set NEXT_TELEMETRY_DISABLED=1
set NODE_ENV=development
cd /d "D:\planai\PlanAI"
npx next dev --port 3002
pause