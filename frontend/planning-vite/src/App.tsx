import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import ProtectedRoute from './routes/ProtectedRoute'
import SuperuserRoute from './routes/SuperuserRoute'
import StateMinisterRoute from './routes/StateMinisterRoute'
import StrategicStaffRoute from './routes/StrategicStaffRoute'
import ExecutiveRoute from './routes/ExecutiveRoute'
import MinisterRoute from './routes/MinisterRoute'
import DashboardLayout from './layouts/DashboardLayout'
import Home from './pages/Home'
import Sectors from './pages/Sectors'
import Departments from './pages/Departments'
import Indicators from './pages/Indicators'
import AnnualPlans from './pages/AnnualPlans'
import QuarterlyBreakdowns from './pages/QuarterlyBreakdowns'
import Performances from './pages/Performances'
import Users from './pages/Users'
import Reviews from './pages/Reviews'
import Validations from './pages/Validations'
import EntryPeriods from './pages/EntryPeriods'
import FinalApprovals from './pages/FinalApprovals'
import MinisterView from './pages/MinisterView'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Home />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sectors"
        element={
          <SuperuserRoute>
            <DashboardLayout>
              <Sectors />
            </DashboardLayout>
          </SuperuserRoute>
        }
      />
      <Route
        path="/departments"
        element={
          <SuperuserRoute>
            <DashboardLayout>
              <Departments />
            </DashboardLayout>
          </SuperuserRoute>
        }
      />
      <Route
        path="/indicators"
        element={
          <SuperuserRoute>
            <DashboardLayout>
              <Indicators />
            </DashboardLayout>
          </SuperuserRoute>
        }
      />
      <Route
        path="/annual-plans"
        element={
          <SuperuserRoute>
            <DashboardLayout>
              <AnnualPlans />
            </DashboardLayout>
          </SuperuserRoute>
        }
      />
      <Route
        path="/quarterly-breakdowns"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <QuarterlyBreakdowns />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/performances"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Performances />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reviews"
        element={
          <StateMinisterRoute>
            <DashboardLayout>
              <Reviews />
            </DashboardLayout>
          </StateMinisterRoute>
        }
      />
      <Route
        path="/users"
        element={
          <SuperuserRoute>
            <DashboardLayout>
              <Users />
            </DashboardLayout>
          </SuperuserRoute>
        }
      />
      <Route
        path="/entry-periods"
        element={
          <SuperuserRoute>
            <DashboardLayout>
              <EntryPeriods />
            </DashboardLayout>
          </SuperuserRoute>
        }
      />
      <Route
        path="/validations"
        element={
          <StrategicStaffRoute>
            <DashboardLayout>
              <Validations />
            </DashboardLayout>
          </StrategicStaffRoute>
        }
      />
      <Route
        path="/final-approvals"
        element={
          <ExecutiveRoute>
            <DashboardLayout>
              <FinalApprovals />
            </DashboardLayout>
          </ExecutiveRoute>
        }
      />
      <Route
        path="/minister-view"
        element={
          <MinisterRoute>
            <DashboardLayout>
              <MinisterView />
            </DashboardLayout>
          </MinisterRoute>
        }
      />
    </Routes>
  )
}

export default App
