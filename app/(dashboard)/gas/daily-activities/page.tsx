'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/context/auth-context'
import { saveGasDailyActivity, getGasDailyActivities, mockBranches } from '@/lib/mock-data'
import { Activity, Plus, Trash2, Calculator } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import type { GasPumpReading } from '@/types'

export default function GasDailyActivitiesPage() {
  const { user, selectedBranchId } = useAuth()
  const isOwner = user?.role === 'org_owner'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [records, setRecords] = useState<any[]>([])
  
  const [pumpReadings, setPumpReadings] = useState<GasPumpReading[]>([
    { id: '1', pump_number: 'Pump 1', start_reading: '', end_reading: '', kg_dispensed: 0 }
  ])
  
  const [systemRecord, setSystemRecord] = useState('')
  const [sunAdjustment, setSunAdjustment] = useState('')
  const [salesperson, setSalesperson] = useState('')

  useEffect(() => {
    // For owners, get all activities across all branches, for managers get branch-specific
    const branchId = user?.role === 'org_owner' ? undefined : (selectedBranchId || user?.assigned_branches[0])
    const branchRecords = getGasDailyActivities(branchId)
    setRecords(branchRecords)
  }, [user?.assigned_branches, selectedBranchId, user?.role])

  const addPump = () => {
    const newPump: GasPumpReading = {
      id: Date.now().toString(),
      pump_number: `Pump ${pumpReadings.length + 1}`,
      start_reading: '',
      end_reading: '',
      kg_dispensed: 0
    }
    setPumpReadings([...pumpReadings, newPump])
  }

  const removePump = (id: string) => {
    setPumpReadings(pumpReadings.filter(p => p.id !== id))
  }

  const updatePump = (id: string, field: keyof GasPumpReading, value: number | string) => {
    setPumpReadings(pumpReadings.map(pump => {
      if (pump.id === id) {
        const updated = { ...pump, [field]: value }
        if (field === 'start_reading' || field === 'end_reading') {
          const start = Number(updated.start_reading) || 0
          const end = Number(updated.end_reading) || 0
          updated.kg_dispensed = Math.max(0, end - start)
        }
        return updated
      }
      return pump
    }))
  }

  const totalPumpKg = pumpReadings.reduce((sum, pump) => sum + pump.kg_dispensed, 0)
  const totalDailyKg = totalPumpKg + (Number(systemRecord) || 0) + (Number(sunAdjustment) || 0)

  const groupByMonth = (records: any[]) => {
    const groups: Record<string, any[]> = {}
    records.forEach((r) => {
      const date = new Date(r.date)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!groups[key]) groups[key] = []
      groups[key].push(r)
    })
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }

  const monthGroups = groupByMonth(records)
  const currentMonth = new Date().toISOString().slice(0, 7)

  const handleSubmit = () => {
    const activity = {
      id: Date.now().toString(),
      branch_id: selectedBranchId || user?.assigned_branches[0] || '',
      date: selectedDate,
      pump_readings: pumpReadings,
      system_record_kg: Number(systemRecord) || 0,
      sun_adjustment_kg: Number(sunAdjustment) || 0,
      total_kg: totalDailyKg,
      salesperson: salesperson,
      created_at: new Date().toISOString()
    }
    
    saveGasDailyActivity(activity)
    setRecords([activity, ...records])
    toast({
      title: 'Activity recorded',
      description: 'Daily activity has been saved successfully.',
    })
    
    // Reset form
    setPumpReadings([{ id: '1', pump_number: 'Pump 1', start_reading: '', end_reading: '', kg_dispensed: 0 }])
    setSystemRecord('')
    setSunAdjustment('')
    setSalesperson('')
  }

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Activity className="w-8 h-8 text-secondary" />
          Gas Daily Activities
        </h1>
        <p className="text-muted-foreground">
          Record daily pump readings, system records, and adjustments
        </p>
      </div>

      {!isOwner && (
        <>
          <Card className="p-6 mb-6 shadow-card">
            <div className="flex items-center gap-4">
              <Label htmlFor="date" className="text-sm font-medium">Activity Date:</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
            </div>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <div className="space-y-6">
              <Card className="p-6 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Pump Readings</h3>
                  <Button onClick={addPump} size="sm" className="bg-secondary hover:bg-secondary/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Pump
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {pumpReadings.map((pump) => (
                    <div key={pump.id} className="p-4 border border-border rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between mb-3">
                        <Input
                          value={pump.pump_number}
                          onChange={(e) => updatePump(pump.id, 'pump_number', e.target.value)}
                          className="w-32 text-sm font-medium"
                        />
                        {pumpReadings.length > 1 && (
                          <Button
                            onClick={() => removePump(pump.id)}
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Start Reading</Label>
                          <Input
                            type="number"
                            value={pump.start_reading}
                            onChange={(e) => updatePump(pump.id, 'start_reading', e.target.value)}
                            className="text-sm border-blue-200 focus:border-blue-400 focus:ring-blue-200"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">End Reading</Label>
                          <Input
                            type="number"
                            value={pump.end_reading}
                            onChange={(e) => updatePump(pump.id, 'end_reading', e.target.value)}
                            className="text-sm border-green-200 focus:border-green-400 focus:ring-green-200"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Kg Dispensed</Label>
                          <Input
                            type="number"
                            value={pump.kg_dispensed}
                            readOnly
                            className="text-sm bg-muted font-semibold"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 p-3 bg-secondary/10 rounded-lg">
                  <p className="text-sm font-medium text-foreground">
                    Total Pump Dispensed: <span className="text-secondary font-bold">{totalPumpKg.toFixed(2)} kg</span>
                  </p>
                </div>
              </Card>

              <Card className="p-6 shadow-card">
                <h3 className="text-lg font-semibold text-foreground mb-4">System Records & Adjustments</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-foreground mb-2 block">
                      System Record (kg)
                    </Label>
                    <Input
                      type="number"
                      value={systemRecord}
                      onChange={(e) => setSystemRecord(e.target.value)}
                      placeholder="Enter system recorded kg"
                      className="border-purple-200 focus:border-purple-400 focus:ring-purple-200"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-foreground mb-2 block">
                      Sun/Shortage Adjustment (kg)
                    </Label>
                    <Input
                      type="number"
                      value={sunAdjustment}
                      onChange={(e) => setSunAdjustment(e.target.value)}
                      placeholder="Enter adjustment for sun loss"
                      className="border-orange-200 focus:border-orange-400 focus:ring-orange-200"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Add positive value if gas reduced due to sun/heat
                    </p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-foreground mb-2 block">
                      Salesperson
                    </Label>
                    <Select value={salesperson} onValueChange={setSalesperson}>
                      <SelectTrigger className="border-teal-200 focus:border-teal-400 focus:ring-teal-200">
                        <SelectValue placeholder="Select salesperson" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="sales_staff">Sales Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="p-6 shadow-card bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-0">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-green-600" />
                  Daily Summary
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Pump Total:</span>
                    <span className="text-sm font-semibold">{totalPumpKg.toFixed(2)} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">System Record:</span>
                    <span className="text-sm font-semibold">{(Number(systemRecord) || 0).toFixed(2)} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Sun Adjustment:</span>
                    <span className="text-sm font-semibold">{(Number(sunAdjustment) || 0).toFixed(2)} kg</span>
                  </div>
                  <div className="pt-2 border-t border-green-200 dark:border-green-800">
                    <div className="flex justify-between">
                      <span className="font-medium text-foreground">Total Daily Kg:</span>
                      <span className="font-bold text-green-600 text-lg">{totalDailyKg.toFixed(2)} kg</span>
                    </div>
                  </div>
                </div>
              </Card>

              <Button 
                onClick={handleSubmit}
                className="w-full bg-secondary hover:bg-secondary/90 text-white font-semibold py-3"
              >
                Record Daily Activity
              </Button>
            </div>
          </div>
        </>
      )}

      <Card className="shadow-card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Daily Activity Records</h3>
        </div>
        
        {records.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-muted-foreground">No daily activities recorded yet</p>
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={[currentMonth]} className="w-full">
            {monthGroups.map(([monthKey, monthRecords]) => {
              const date = new Date(monthKey + '-01')
              const monthName = date.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
              const monthTotal = monthRecords.reduce((sum, r) => sum + r.total_kg, 0)
              
              return (
                <AccordionItem key={monthKey} value={monthKey} className="border-b">
                  <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span className="font-semibold">{monthName}</span>
                      <span className="text-sm text-muted-foreground">
                        {monthRecords.length} activities • {monthTotal.toFixed(2)} kg
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/50">
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Date</th>
                            {isOwner && <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Branch</th>}
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Pumps</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Pump Total</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">System</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Adjustment</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Salesperson</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Total Kg</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthRecords.map((record) => {
                            const branch = mockBranches.find(b => b.id === record.branch_id)
                            return (
                              <tr key={record.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                                <td className="px-6 py-4 text-foreground">{new Date(record.date).toLocaleDateString()}</td>
                                {isOwner && <td className="px-6 py-4 text-foreground">{branch?.name || 'Unknown Branch'}</td>}
                                <td className="px-6 py-4 text-foreground">{record.pump_readings.length}</td>
                                <td className="px-6 py-4 text-foreground">{record.pump_readings.reduce((sum: number, p: any) => sum + p.kg_dispensed, 0).toFixed(2)} kg</td>
                                <td className="px-6 py-4 text-foreground">{record.system_record_kg.toFixed(2)} kg</td>
                                <td className="px-6 py-4 text-foreground">{record.sun_adjustment_kg.toFixed(2)} kg</td>
                                <td className="px-6 py-4 text-foreground capitalize">{record.salesperson || 'N/A'}</td>
                                <td className="px-6 py-4 font-semibold text-foreground">{record.total_kg.toFixed(2)} kg</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        )}
      </Card>
    </div>
  )
}