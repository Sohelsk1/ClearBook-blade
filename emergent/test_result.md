#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  ClearBook dashboard clone with modern UI/UX upgrade. Frontend-only MVP with mock data has been
  completed. Now adding a FastAPI + MongoDB backend so the ledger persists per-user and syncs
  across devices. JWT auth, CRUD for expenses/incomes/budgets/goals, and a summary endpoint.

backend:
  - task: "Auth (signup/login/me/update profile) with JWT + bcrypt"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Implemented /api/auth/signup, /api/auth/login, /api/me, PATCH /api/me. JWT via pyjwt, bcrypt via passlib. Signup seeds sample expenses/incomes/budgets/goals for onboarding."
  - task: "Expenses CRUD"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "GET/POST/PUT/DELETE /api/expenses[/id]. User scoped."
  - task: "Incomes CRUD"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "GET/POST/PUT/DELETE /api/incomes[/id]. User scoped."
  - task: "Budgets CRUD (upsert by category on POST)"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "POST replaces existing budget for the same category. PUT/DELETE by id."
  - task: "Goals CRUD"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Standard CRUD. Used by dashboard and Goals page."
  - task: "Summary endpoint for dashboard aggregates"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "GET /api/summary returns totalIncome, totalExpense, remaining, savingsRate, byCategory[], weekly[], yearTrend[], spendScore."

frontend:
  - task: "Auth flow + protected routes"
    implemented: true
    working: "NA"
    file: "frontend/src/pages/Auth.jsx, frontend/src/contexts/AuthContext.js, frontend/src/components/RequireAuth.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Login/signup post to backend; JWT saved in localStorage; RequireAuth guards dashboard routes."
  - task: "Pages wired to API (Dashboard/Expenses/Income/Budgets/Goals/Worksheet/Settings)"
    implemented: true
    working: "NA"
    file: "frontend/src/pages/*.jsx, frontend/src/lib/api.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "All pages fetch/create/update/delete via /api. Removed old localStorage mock store."

metadata:
  created_by: "main_agent"
  version: "1.1"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus:
    - "Auth (signup/login/me/update profile) with JWT + bcrypt"
    - "Expenses CRUD"
    - "Incomes CRUD"
    - "Budgets CRUD (upsert by category on POST)"
    - "Goals CRUD"
    - "Summary endpoint for dashboard aggregates"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Backend created with FastAPI + Motor + JWT + bcrypt at /app/backend/server.py.
      Base URL from frontend is `${REACT_APP_BACKEND_URL}/api`.
      Signup seeds ~10 sample expenses, 3 incomes, 5 budgets, 3 goals for a new user.
      Please test:
      1) POST /api/auth/signup with a unique email/password → returns {token, user}; duplicate email → 400.
      2) POST /api/auth/login with correct creds → token; wrong password → 401.
      3) GET /api/me with token → user; without token → 401.
      4) PATCH /api/me updates name/currency; email uniqueness enforced.
      5) Full CRUD on /api/expenses, /api/incomes, /api/budgets, /api/goals scoped per user.
         Verify user isolation (user A cannot see/modify user B items → 404 on cross-user IDs).
      6) POST /api/budgets replaces existing for same category.
      7) GET /api/summary returns numeric totals, byCategory[], weekly[], yearTrend[], spendScore.
