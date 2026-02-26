'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/auth-context'
import { getGasDailyActivities } from '@/lib/mock-data'
import { Calendar, TrendingUp, BarChart3, Activity } from 'lucide-react'

export default function GasWeeklyDashboard() {
  const { user, selectedBranchId } = useAuth()
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const today = new Date()
    const monday = new Date(today.setDate(today.getDate() - today.getDay() + 1))
    return monday.toISOString().split('T')[0]
  })

  const weekData = useMemo(() => {
    const startDate = new Date(selectedWeek)
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 6)
    
    // For owners, get all activities across all branches, for managers get branch-specific
    const branchId = user?.role === 'org_owner' ? undefined : (selectedBranchId || user?.assigned_branches[0])
    const activities = getGasDailyActivities(
      branchId,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    )

    const totalKg = activities.reduce((sum, a) => sum + a.total_kg, 0)
    const avgDaily = activities.length > 0 ? totalKg / 7 : 0

    return { activities, totalKg, avgDaily }
  }, [selectedWeek, user, selectedBranchId])

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-secondary" />
          Weekly Gas Dashboard
        </h1>
        <p className="text-muted-foreground">Weekly performance overview and analytics</p>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex items-center gap-4">
          <Label htmlFor="week" className="text-sm font-medium">Week Starting:</Label>
          <Input
            id="week"
            type="date"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="w-auto"
          />
        </div>
      </Card>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Gas Dispensed</p>
              <p className="text-2xl font-bold text-blue-600">{weekData.totalKg.toFixed(2)} kg</p>
            </div>
            <Activity className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Days</p>
              <p className="text-2xl font-bold text-green-600">{weekData.activities.length}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Daily Average</p>
              <p className="text-2xl font-bold text-purple-600">{weekData.avgDaily.toFixed(2)} kg</p>
            </div>
            <Calendar className="w-8 h-8 text-purple-600" />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Daily Activities This Week</h3>
        {weekData.activities.length > 0 ? (
          <div className="space-y-4">
            {weekData.activities.map((activity) => (
              <div key={activity.id} className="p-4 border border-border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{new Date(activity.date).toLocaleDateString()}</p>
                    <p className="text-sm text-muted-foreground">
                      {activity.pump_readings.length} pumps • {activity.total_kg.toFixed(2)} kg total
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{activity.total_kg.toFixed(2)} kg</p>
                    <p className="text-sm text-muted-foreground">Total Gas</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">No activities recorded for this week</p>
        )}
      </Card>
    </div>
  )
}