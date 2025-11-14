import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import ProtectedRoute from './routes/ProtectedRoute'
import SuperuserRoute from './routes/SuperuserRoute'
import StateMinisterRoute from './routes/StateMinisterRoute'
import StrategicStaffRoute from './routes/StrategicStaffRoute'
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

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sectors"
        element={
          <SuperuserRoute>
            <Sectors />
          </SuperuserRoute>
        }
      />
      <Route
        path="/departments"
        element={
          <SuperuserRoute>
            <Departments />
          </SuperuserRoute>
        }
      />
      <Route
        path="/indicators"
        element={
          <SuperuserRoute>
            <Indicators />
          </SuperuserRoute>
        }
      />
      <Route
        path="/annual-plans"
        element={
          <SuperuserRoute>
            <AnnualPlans />
          </SuperuserRoute>
        }
      />
      <Route
        path="/quarterly-breakdowns"
        element={
          <ProtectedRoute>
            <QuarterlyBreakdowns />
          </ProtectedRoute>
        }
      />
      <Route
        path="/performances"
        element={
          <ProtectedRoute>
            <Performances />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reviews"
        element={
          <StateMinisterRoute>
            <Reviews />
          </StateMinisterRoute>
        }
      />
      <Route
        path="/users"
        element={
          <SuperuserRoute>
            <Users />
          </SuperuserRoute>
        }
      />
      <Route
        path="/entry-periods"
        element={
          <SuperuserRoute>
            <EntryPeriods />
          </SuperuserRoute>
        }
      />
      <Route
        path="/validations"
        element={
          <StrategicStaffRoute>
            <Validations />
          </StrategicStaffRoute>
        }
      />
    </Routes>
  )
}

export default App
