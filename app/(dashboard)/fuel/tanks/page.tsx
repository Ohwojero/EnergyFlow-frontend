'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Fuel, Plus, Waves } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { toast } from '@/hooks/use-toast'
import { apiService } from '@/lib/api'
import type { Branch, FuelTank, FuelTankReading } from '@/types'
import { toLagosDateKey } from '@/lib/lagos-time'

type TankWithBranch = FuelTank & { branch_name?: string }
type TankReadingWithTank = FuelTankReading & { tank_name?: string; branch_name?: string }

export default function FuelTanksPage() {
  const { user, selectedBranchId } = useAuth()
  const isOwner = user?.role === 'org_owner'
  const isFuelManager = user?.role === 'fuel_manager'
  const canView = isOwner || isFuelManager
  const canManage = isFuelManager

  const [branches, setBranches] = useState<Branch[]>([])
  const [activeBranchId, setActiveBranchId] = useState<string | null>(selectedBranchId)
  const [tanks, setTanks] = useState<TankWithBranch[]>([])
  const [readings, setReadings] = useState<TankReadingWithTank[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isTankDialogOpen, setIsTankDialogOpen] = useState(false)
  const [isReadingDialogOpen, setIsReadingDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [todayKey, setTodayKey] = useState(() => toLagosDateKey())
  const [tankForm, setTankForm] = useState({
    name: '',
    product_type: 'PMS',
    capacity_litres: '',
    current_volume_litres: '',
  })
  const [readingForm, setReadingForm] = useState({
    tank_id: '',
    reading_date: toLagosDateKey(),
    opening_volume_litres: '',
    deliveries_litres: '0',
    transfers_out_litres: '0',
    sales_litres: '0',
    actual_closing_litres: '',
    dip_reading_litres: '',
    sensor_volume_litres: '',
    notes: '',
  })

  const activeTank = useMemo(
    () => tanks.find((tank) => tank.id === readingForm.tank_id) ?? null,
    [readingForm.tank_id, tanks],
  )

  const latestReadingByTank = useMemo(() => {
    const map = new Map<string, TankReadingWithTank>()
    readings.forEach((reading) => {
      const existing = map.get(reading.tank_id)
      const currentStamp = `${reading.reading_date}T${reading.created_at}`
      const existingStamp = existing ? `${existing.reading_date}T${existing.created_at}` : ''
      if (!existing || currentStamp > existingStamp) {
        map.set(reading.tank_id, reading)
      }
    })
    return map
  }, [readings])

  const expectedClosingPreview = useMemo(() => {
    const opening = Number(readingForm.opening_volume_litres || 0)
    const deliveries = Number(readingForm.deliveries_litres || 0)
    const transfersOut = Number(readingForm.transfers_out_litres || 0)
    const sales = Number(readingForm.sales_litres || 0)
    return opening + deliveries - sales - transfersOut
  }, [readingForm])

  const variancePreview = useMemo(() => {
    const actual = Number(readingForm.actual_closing_litres || 0)
    return actual - expectedClosingPreview
  }, [expectedClosingPreview, readingForm.actual_closing_litres])

  useEffect(() => {
    const timer = setInterval(() => {
      const next = toLagosDateKey()
      setTodayKey((prev) => (prev === next ? prev : next))
    }, 60_000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!canView) return

    const loadBranches = async () => {
      try {
        const list = await apiService.getFuelBranches()
        const normalized = Array.isArray(list) ? list : []
        setBranches(normalized)

        if (normalized.length === 0) {
          setActiveBranchId(null)
          return
        }

        if (selectedBranchId && normalized.some((branch) => branch.id === selectedBranchId)) {
          setActiveBranchId(selectedBranchId)
          return
        }

        if (isFuelManager) {
          const assigned = normalized.find((branch) => user?.assigned_branches?.includes(branch.id))
          setActiveBranchId(assigned?.id ?? normalized[0].id)
          return
        }

        setActiveBranchId((prev) => prev && normalized.some((branch) => branch.id === prev) ? prev : normalized[0].id)
      } catch {
        toast({
          title: 'Load failed',
          description: 'Could not load fuel branches.',
        })
      }
    }

    loadBranches()
  }, [canView, isFuelManager, selectedBranchId, user?.assigned_branches])

  useEffect(() => {
    if (!activeBranchId || !canView) {
      setTanks([])
      setReadings([])
      return
    }

    const loadBranchData = async () => {
      setIsLoading(true)
      try {
        const [tankList, readingList] = await Promise.all([
          apiService.getFuelTanks(activeBranchId).catch(() => []),
          apiService.getFuelTankReadings(activeBranchId).catch(() => []),
        ])

        const branchName = branches.find((branch) => branch.id === activeBranchId)?.name
        const normalizedTanks = (Array.isArray(tankList) ? tankList : []).map((tank: any) => ({
          id: String(tank.id),
          branch_id: String(tank.branch?.id ?? tank.branch_id ?? activeBranchId),
          name: String(tank.name ?? ''),
          product_type: tank.product_type,
          capacity_litres: Number(tank.capacity_litres ?? 0),
          current_volume_litres: Number(tank.current_volume_litres ?? 0),
          status: String(tank.status ?? 'active'),
          created_at: String(tank.created_at ?? new Date().toISOString()),
          updated_at: String(tank.updated_at ?? new Date().toISOString()),
          branch_name: tank.branch?.name ?? branchName,
        }))
        const tankNameById = new Map(normalizedTanks.map((tank) => [tank.id, tank.name]))

        const normalizedReadings = (Array.isArray(readingList) ? readingList : []).map((reading: any) => ({
          id: String(reading.id),
          tank_id: String(reading.tank?.id ?? reading.tank_id ?? ''),
          reading_date: String(reading.reading_date ?? ''),
          opening_volume_litres: Number(reading.opening_volume_litres ?? 0),
          deliveries_litres: Number(reading.deliveries_litres ?? 0),
          transfers_out_litres: Number(reading.transfers_out_litres ?? 0),
          sales_litres: Number(reading.sales_litres ?? 0),
          expected_closing_litres: Number(reading.expected_closing_litres ?? 0),
          actual_closing_litres: Number(reading.actual_closing_litres ?? 0),
          variance_litres: Number(reading.variance_litres ?? 0),
          dip_reading_litres: reading.dip_reading_litres == null ? null : Number(reading.dip_reading_litres),
          sensor_volume_litres: reading.sensor_volume_litres == null ? null : Number(reading.sensor_volume_litres),
          recorded_by_name: reading.recorded_by_name ?? null,
          notes: String(reading.notes ?? ''),
          created_at: String(reading.created_at ?? new Date().toISOString()),
          tank_name: reading.tank?.name ?? tankNameById.get(String(reading.tank?.id ?? reading.tank_id ?? '')),
          branch_name: reading.tank?.branch?.name ?? branchName,
        }))

        setTanks(normalizedTanks)
        setReadings(normalizedReadings)
      } finally {
        setIsLoading(false)
      }
    }

    loadBranchData()
  }, [activeBranchId, branches, canView])

  useEffect(() => {
    if (!tanks.length) {
      setReadingForm((prev) => ({ ...prev, tank_id: '' }))
      return
    }
    setReadingForm((prev) => {
      const selectedTank = tanks.find((tank) => tank.id === prev.tank_id) ?? tanks[0]
      const latestReading = latestReadingByTank.get(selectedTank.id)
      const carryForwardVolume = latestReading
        ? latestReading.actual_closing_litres
        : selectedTank.current_volume_litres
      return {
        ...prev,
        tank_id: selectedTank.id,
        reading_date: prev.reading_date || todayKey,
        opening_volume_litres: prev.opening_volume_litres || String(carryForwardVolume),
        actual_closing_litres: prev.actual_closing_litres || String(carryForwardVolume),
      }
    })
  }, [latestReadingByTank, tanks, todayKey])

  useEffect(() => {
    if (!isReadingDialogOpen) return
    setReadingForm((prev) => {
      const selectedTank = tanks.find((tank) => tank.id === prev.tank_id) ?? tanks[0]
      if (!selectedTank) {
        return { ...prev, reading_date: todayKey }
      }
      const latestReading = latestReadingByTank.get(selectedTank.id)
      const carryForwardVolume = latestReading
        ? latestReading.actual_closing_litres
        : selectedTank.current_volume_litres
      const shouldResetForNewDay = prev.reading_date !== todayKey
      return {
        ...prev,
        tank_id: selectedTank.id,
        reading_date: todayKey,
        opening_volume_litres: shouldResetForNewDay ? String(carryForwardVolume) : prev.opening_volume_litres,
        actual_closing_litres: shouldResetForNewDay ? String(carryForwardVolume) : prev.actual_closing_litres,
      }
    })
  }, [isReadingDialogOpen, latestReadingByTank, tanks, todayKey])

  const totalCapacity = tanks.reduce((sum, tank) => sum + tank.capacity_litres, 0)
  const currentVolume = tanks.reduce((sum, tank) => sum + tank.current_volume_litres, 0)
  const latestVariance = readings.length > 0 ? readings[0].variance_litres : 0
  const latestReadingDate = readings.length > 0 ? readings[0].reading_date : 'No reading yet'

  const resetTankForm = () => {
    setTankForm({
      name: '',
      product_type: 'PMS',
      capacity_litres: '',
      current_volume_litres: '',
    })
  }

  const resetReadingForm = () => {
    const firstTank = tanks[0]
    const latestReading = firstTank ? latestReadingByTank.get(firstTank.id) : null
    const carryForwardVolume = latestReading
      ? latestReading.actual_closing_litres
      : firstTank?.current_volume_litres ?? ''
    setReadingForm({
      tank_id: firstTank?.id ?? '',
      reading_date: todayKey,
      opening_volume_litres: firstTank ? String(carryForwardVolume) : '',
      deliveries_litres: '0',
      transfers_out_litres: '0',
      sales_litres: '0',
      actual_closing_litres: firstTank ? String(carryForwardVolume) : '',
      dip_reading_litres: '',
      sensor_volume_litres: '',
      notes: '',
    })
  }

  const handleCreateTank = async (event: FormEvent) => {
    event.preventDefault()
    if (!activeBranchId) {
      toast({
        title: 'Missing branch',
        description: 'Select a fuel branch before saving a tank.',
      })
      return
    }

    const capacity = Number(tankForm.capacity_litres)
    const currentVolume = Number(tankForm.current_volume_litres || 0)

    if (!tankForm.name.trim() || !capacity) {
      toast({
        title: 'Missing details',
        description: 'Tank name and capacity are required.',
      })
      return
    }

    setIsSubmitting(true)
    try {
      await apiService.createFuelTank({
        branch_id: activeBranchId,
        name: tankForm.name.trim(),
        product_type: tankForm.product_type,
        capacity_litres: capacity,
        current_volume_litres: currentVolume,
      })
      setIsTankDialogOpen(false)
      resetTankForm()
      const [tankList, readingList] = await Promise.all([
        apiService.getFuelTanks(activeBranchId),
        apiService.getFuelTankReadings(activeBranchId).catch(() => []),
      ])
      setTanks(Array.isArray(tankList) ? tankList.map((tank: any) => ({
        id: String(tank.id),
        branch_id: String(tank.branch?.id ?? tank.branch_id ?? activeBranchId),
        name: String(tank.name ?? ''),
        product_type: tank.product_type,
        capacity_litres: Number(tank.capacity_litres ?? 0),
        current_volume_litres: Number(tank.current_volume_litres ?? 0),
        status: String(tank.status ?? 'active'),
        created_at: String(tank.created_at ?? new Date().toISOString()),
      })) : [])
      setReadings(Array.isArray(readingList) ? readingList.map((reading: any) => ({
        id: String(reading.id),
        tank_id: String(reading.tank?.id ?? reading.tank_id ?? ''),
        reading_date: String(reading.reading_date ?? ''),
        opening_volume_litres: Number(reading.opening_volume_litres ?? 0),
        deliveries_litres: Number(reading.deliveries_litres ?? 0),
        transfers_out_litres: Number(reading.transfers_out_litres ?? 0),
        sales_litres: Number(reading.sales_litres ?? 0),
        expected_closing_litres: Number(reading.expected_closing_litres ?? 0),
        actual_closing_litres: Number(reading.actual_closing_litres ?? 0),
        variance_litres: Number(reading.variance_litres ?? 0),
        dip_reading_litres: reading.dip_reading_litres == null ? null : Number(reading.dip_reading_litres),
        sensor_volume_litres: reading.sensor_volume_litres == null ? null : Number(reading.sensor_volume_litres),
        recorded_by_name: reading.recorded_by_name ?? null,
        notes: String(reading.notes ?? ''),
        created_at: String(reading.created_at ?? new Date().toISOString()),
        tank_name: reading.tank?.name ?? '',
      })) : [])
      toast({
        title: 'Tank created',
        description: 'Fuel tank has been added successfully.',
      })
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Could not create fuel tank.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRecordReading = async (event: FormEvent) => {
    event.preventDefault()
    if (!readingForm.tank_id) {
      toast({
        title: 'Missing tank',
        description: 'Select a tank before recording a reading.',
      })
      return
    }

    setIsSubmitting(true)
    try {
      await apiService.createFuelTankReading({
        tank_id: readingForm.tank_id,
        reading_date: readingForm.reading_date,
        opening_volume_litres: Number(readingForm.opening_volume_litres || 0),
        deliveries_litres: Number(readingForm.deliveries_litres || 0),
        transfers_out_litres: Number(readingForm.transfers_out_litres || 0),
        sales_litres: Number(readingForm.sales_litres || 0),
        actual_closing_litres: Number(readingForm.actual_closing_litres || 0),
        dip_reading_litres: readingForm.dip_reading_litres ? Number(readingForm.dip_reading_litres) : undefined,
        sensor_volume_litres: readingForm.sensor_volume_litres ? Number(readingForm.sensor_volume_litres) : undefined,
        notes: readingForm.notes.trim(),
      })
      setIsReadingDialogOpen(false)
      resetReadingForm()
      if (activeBranchId) {
        const [tankList, readingList] = await Promise.all([
          apiService.getFuelTanks(activeBranchId),
          apiService.getFuelTankReadings(activeBranchId),
        ])
        setTanks(Array.isArray(tankList) ? tankList.map((tank: any) => ({
          id: String(tank.id),
          branch_id: String(tank.branch?.id ?? tank.branch_id ?? activeBranchId),
          name: String(tank.name ?? ''),
          product_type: tank.product_type,
          capacity_litres: Number(tank.capacity_litres ?? 0),
          current_volume_litres: Number(tank.current_volume_litres ?? 0),
          status: String(tank.status ?? 'active'),
          created_at: String(tank.created_at ?? new Date().toISOString()),
        })) : [])
        setReadings(Array.isArray(readingList) ? readingList.map((reading: any) => ({
          id: String(reading.id),
          tank_id: String(reading.tank?.id ?? reading.tank_id ?? ''),
          reading_date: String(reading.reading_date ?? ''),
          opening_volume_litres: Number(reading.opening_volume_litres ?? 0),
          deliveries_litres: Number(reading.deliveries_litres ?? 0),
          transfers_out_litres: Number(reading.transfers_out_litres ?? 0),
          sales_litres: Number(reading.sales_litres ?? 0),
          expected_closing_litres: Number(reading.expected_closing_litres ?? 0),
          actual_closing_litres: Number(reading.actual_closing_litres ?? 0),
          variance_litres: Number(reading.variance_litres ?? 0),
          dip_reading_litres: reading.dip_reading_litres == null ? null : Number(reading.dip_reading_litres),
          sensor_volume_litres: reading.sensor_volume_litres == null ? null : Number(reading.sensor_volume_litres),
          recorded_by_name: reading.recorded_by_name ?? null,
          notes: String(reading.notes ?? ''),
          created_at: String(reading.created_at ?? new Date().toISOString()),
          tank_name: reading.tank?.name ?? '',
        })) : [])
      }
      toast({
        title: 'Reading recorded',
        description: 'Daily tank reading has been saved.',
      })
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Could not record tank reading.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!canView) {
    return (
      <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
        <Card className="p-6 text-sm text-muted-foreground">
          Tank storage management is available to fuel managers and organisation owners.
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Fuel className="w-8 h-8 text-orange-500" />
            Tank Storage Management
          </h1>
          <p className="text-muted-foreground">
            Monitor tank levels, daily storage balance, and reconciliation variance.
          </p>
        </div>
        {canManage ? (
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => {
              resetReadingForm()
              setIsReadingDialogOpen(true)
            }}>
              Record Reading
            </Button>
            <Button type="button" className="w-full sm:w-auto" onClick={() => {
              resetTankForm()
              setIsTankDialogOpen(true)
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Tank
            </Button>
          </div>
        ) : null}
      </div>

      <Card className="p-4 mb-6 bg-muted/50 border-border">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Label className="font-semibold text-foreground">Fuel Branch:</Label>
          <Select value={activeBranchId ?? ''} onValueChange={setActiveBranchId}>
            <SelectTrigger className="w-full sm:w-80">
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name} ({branch.location})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-6 !bg-blue-100 dark:!bg-blue-900/20 border-0 shadow-card hover:shadow-card-hover transition-all">
          <p className="text-sm text-muted-foreground mb-1">Total Tanks</p>
          <h3 className="text-3xl font-bold text-foreground">{tanks.length}</h3>
        </Card>
        <Card className="p-6 !bg-green-100 dark:!bg-green-900/20 border-0 shadow-card hover:shadow-card-hover transition-all">
          <p className="text-sm text-muted-foreground mb-1">Total Capacity</p>
          <h3 className="text-3xl font-bold text-foreground">{formatLitres(totalCapacity)}</h3>
        </Card>
        <Card className="p-6 !bg-purple-100 dark:!bg-purple-900/20 border-0 shadow-card hover:shadow-card-hover transition-all">
          <p className="text-sm text-muted-foreground mb-1">Current Volume</p>
          <h3 className="text-3xl font-bold text-foreground">{formatLitres(currentVolume)}</h3>
        </Card>
        <Card className="p-6 !bg-orange-100 dark:!bg-orange-900/20 border-0 shadow-card hover:shadow-card-hover transition-all">
          <p className="text-sm text-muted-foreground mb-1">Latest Variance</p>
          <h3 className={`text-3xl font-bold ${latestVariance < 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatLitres(latestVariance)}
          </h3>
          <p className="text-xs text-muted-foreground mt-2">{latestReadingDate}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="overflow-hidden border border-orange-200/70 bg-orange-50/40 shadow-card hover:shadow-card-hover transition-all dark:border-orange-800/40 dark:bg-orange-950/10">
          <div className="flex items-center gap-2 border-b border-orange-200/70 bg-orange-100/50 p-6 dark:border-orange-800/40 dark:bg-orange-900/10">
            <Fuel className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <h3 className="text-lg font-semibold text-foreground">Tank Register</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-orange-200/60 bg-orange-100/30 dark:border-orange-800/30 dark:bg-orange-900/5">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-300">Tank</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-300">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-300">Capacity</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-300">Current Volume</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-300">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading tanks...</td>
                  </tr>
                ) : tanks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No fuel tanks added for this branch yet.</td>
                  </tr>
                ) : (
                  tanks.map((tank) => (
                    <tr key={tank.id} className="border-b border-orange-200/40 transition-colors hover:bg-orange-100/30 dark:border-orange-800/20 dark:hover:bg-orange-900/10">
                      <td className="px-6 py-4 font-medium text-foreground">{tank.name}</td>
                      <td className="px-6 py-4 text-foreground">{tank.product_type}</td>
                      <td className="px-6 py-4 text-foreground">{formatLitres(tank.capacity_litres)}</td>
                      <td className="px-6 py-4 text-foreground">{formatLitres(tank.current_volume_litres)}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold capitalize text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                          {tank.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="overflow-hidden border border-blue-200/70 bg-blue-50/40 shadow-card hover:shadow-card-hover transition-all dark:border-blue-800/40 dark:bg-blue-950/10">
          <div className="flex items-center gap-2 border-b border-blue-200/70 bg-blue-100/50 p-6 dark:border-blue-800/40 dark:bg-blue-900/10">
            <Waves className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-foreground">Daily Tank Readings</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-blue-200/60 bg-blue-100/30 dark:border-blue-800/30 dark:bg-blue-900/5">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Tank</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Expected</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Actual</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Variance</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading readings...</td>
                  </tr>
                ) : readings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No daily tank readings recorded yet.</td>
                  </tr>
                ) : (
                  readings.map((reading) => (
                    <tr key={reading.id} className="border-b border-blue-200/40 transition-colors hover:bg-blue-100/30 dark:border-blue-800/20 dark:hover:bg-blue-900/10">
                      <td className="px-6 py-4 text-foreground">{reading.reading_date}</td>
                      <td className="px-6 py-4 font-medium text-foreground">{reading.tank_name || 'Tank'}</td>
                      <td className="px-6 py-4 text-foreground">{formatLitres(reading.expected_closing_litres)}</td>
                      <td className="px-6 py-4 text-foreground">{formatLitres(reading.actual_closing_litres)}</td>
                      <td className={`px-6 py-4 font-semibold ${reading.variance_litres < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatLitres(reading.variance_litres)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Dialog open={canManage && isTankDialogOpen} onOpenChange={setIsTankDialogOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Fuel Tank</DialogTitle>
            <DialogDescription>Create a branch-level fuel storage tank.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTank} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tank-name">Tank Name</Label>
              <Input id="tank-name" value={tankForm.name} onChange={(e) => setTankForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tank-product">Product Type</Label>
              <Select value={tankForm.product_type} onValueChange={(value) => setTankForm((prev) => ({ ...prev, product_type: value }))}>
                <SelectTrigger id="tank-product">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PMS">PMS</SelectItem>
                  <SelectItem value="AGO">AGO</SelectItem>
                  <SelectItem value="DPK">DPK</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tank-capacity">Capacity (L)</Label>
                <Input id="tank-capacity" type="number" min="0" value={tankForm.capacity_litres} onChange={(e) => setTankForm((prev) => ({ ...prev, capacity_litres: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tank-current">Current Volume (L)</Label>
                <Input id="tank-current" type="number" min="0" value={tankForm.current_volume_litres} onChange={(e) => setTankForm((prev) => ({ ...prev, current_volume_litres: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsTankDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Tank'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={canManage && isReadingDialogOpen} onOpenChange={setIsReadingDialogOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Tank Reading</DialogTitle>
            <DialogDescription>Log the daily storage balance for a fuel tank.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecordReading} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reading-tank">Tank</Label>
                <Select value={readingForm.tank_id} onValueChange={(value) => {
                  const selected = tanks.find((tank) => tank.id === value)
                  const latestReading = selected ? latestReadingByTank.get(selected.id) : null
                  const carryForwardVolume = latestReading
                    ? latestReading.actual_closing_litres
                    : selected?.current_volume_litres
                  setReadingForm((prev) => ({
                    ...prev,
                    tank_id: value,
                    reading_date: todayKey,
                    opening_volume_litres: selected ? String(carryForwardVolume) : prev.opening_volume_litres,
                    actual_closing_litres: selected ? String(carryForwardVolume) : prev.actual_closing_litres,
                  }))
                }}>
                  <SelectTrigger id="reading-tank">
                    <SelectValue placeholder="Select tank" />
                  </SelectTrigger>
                  <SelectContent>
                    {tanks.map((tank) => (
                      <SelectItem key={tank.id} value={tank.id}>
                        {tank.name} ({tank.product_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reading-date">Reading Date</Label>
                <Input id="reading-date" type="date" value={readingForm.reading_date} onChange={(e) => setReadingForm((prev) => ({ ...prev, reading_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="opening-volume">Opening Volume (L)</Label>
                <Input id="opening-volume" type="number" min="0" value={readingForm.opening_volume_litres} onChange={(e) => setReadingForm((prev) => ({ ...prev, opening_volume_litres: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveries">Deliveries (L)</Label>
                <Input id="deliveries" type="number" min="0" value={readingForm.deliveries_litres} onChange={(e) => setReadingForm((prev) => ({ ...prev, deliveries_litres: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transfers-out">Transfers Out (L)</Label>
                <Input id="transfers-out" type="number" min="0" value={readingForm.transfers_out_litres} onChange={(e) => setReadingForm((prev) => ({ ...prev, transfers_out_litres: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sales-litres">Sales (L)</Label>
                <Input id="sales-litres" type="number" min="0" value={readingForm.sales_litres} onChange={(e) => setReadingForm((prev) => ({ ...prev, sales_litres: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="actual-closing">Actual Closing (L)</Label>
                <Input id="actual-closing" type="number" min="0" value={readingForm.actual_closing_litres} onChange={(e) => setReadingForm((prev) => ({ ...prev, actual_closing_litres: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Expected Closing (L)</Label>
                <Input readOnly value={expectedClosingPreview.toFixed(2)} className="bg-muted/40" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dip-reading">Dip Reading (L)</Label>
                <Input id="dip-reading" type="number" min="0" value={readingForm.dip_reading_litres} onChange={(e) => setReadingForm((prev) => ({ ...prev, dip_reading_litres: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sensor-volume">Sensor Volume (L)</Label>
                <Input id="sensor-volume" type="number" min="0" value={readingForm.sensor_volume_litres} onChange={(e) => setReadingForm((prev) => ({ ...prev, sensor_volume_litres: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Variance (L)</Label>
                <Input readOnly value={variancePreview.toFixed(2)} className={variancePreview < 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'} />
              </div>
            </div>
            {activeTank ? (
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                Current stored volume for <span className="font-semibold text-foreground">{activeTank.name}</span>: {formatLitres(activeTank.current_volume_litres)}
              </div>
            ) : null}
            {activeTank ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-800/40 dark:bg-blue-950/20 dark:text-blue-300">
                Next-day carry forward is enabled. Opening volume defaults to the latest saved closing volume for the selected tank.
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="reading-notes">Notes</Label>
              <Input id="reading-notes" value={readingForm.notes} onChange={(e) => setReadingForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Optional comments about dip, delivery, loss, or sensor status" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsReadingDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || tanks.length === 0}>
                {isSubmitting ? 'Saving...' : 'Save Reading'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function formatLitres(value: number) {
  const rounded = Number.isFinite(value) ? value : 0
  return `${rounded.toLocaleString(undefined, { maximumFractionDigits: 2 })} L`
}
