import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Check, AlertTriangle, Palette, Search, Star, Clock, Grid3X3, List, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { RAL_COLORS, findRALColor, formatRALWithName, type RALColor } from '@/lib/ral-colors';
import { STRUCTURE_TYPE_LABELS, GLOSS_TYPE_LABELS } from '@/lib/types';
import type { Color } from '@/lib/types';
import { useStructuresGlosses } from '@/hooks/useStructuresGlosses';

interface SmartColorPickerProps {
  value?: string; // color_id
  onChange: (colorId: string) => void;
}

const STRUCTURE_OPTIONS: string[] = ['hladka', 'jemna', 'hruba', 'antik', 'kladivkova'];
const GLOSS_OPTIONS: string[] = ['leskle', 'polomatne', 'matne', 'hlboko_matne', 'metalicke', 'fluorescentne', 'glitrove', 'perletove', 'satenovane'];

// RAL color family groups
const RAL_FAMILIES: { name: string; range: [number, number]; color: string }[] = [
  { name: 'Žlté', range: [1000, 1999], color: '#F5D033' },
  { name: 'Oranžové', range: [2000, 2999], color: '#FF7514' },
  { name: 'Červené', range: [3000, 3999], color: '#CC0605' },
  { name: 'Fialové', range: [4000, 4999], color: '#924E7D' },
  { name: 'Modré', range: [5000, 5999], color: '#2271B3' },
  { name: 'Zelené', range: [6000, 6999], color: '#35682D' },
  { name: 'Sivé', range: [7000, 7999], color: '#909090' },
  { name: 'Hnedé', range: [8000, 8999], color: '#6F4F28' },
  { name: 'Biele/Čierne', range: [9000, 9999], color: '#F4F4F4' },
];

// Local storage key for recent colors
const RECENT_COLORS_KEY = 'lakovnaPro_recentColors';

function getRecentColors(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_COLORS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentColor(colorId: string) {
  try {
    const recent = getRecentColors().filter(id => id !== colorId);
    recent.unshift(colorId);
    localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(recent.slice(0, 10)));
  } catch {
    // Ignore storage errors
  }
}

export function SmartColorPicker({ value, onChange }: SmartColorPickerProps) {
  const queryClient = useQueryClient();
  const { structures, glosses, getLabelForStructure, getLabelForGloss } = useStructuresGlosses();
  const [structure, setStructure] = useState<string>('');
  const [gloss, setGloss] = useState<string>('');
  const [ralCode, setRalCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [pendingColor, setPendingColor] = useState<{ structure: string; gloss: string; ralCode: string; hexCode: string } | null>(null);
  const [recentColorIds, setRecentColorIds] = useState<string[]>([]);

  // Load recent colors on mount
  useEffect(() => {
    setRecentColorIds(getRecentColors());
  }, []);

  // Fetch existing colors from database
  const { data: existingColors } = useQuery({
    queryKey: ['colors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colors')
        .select('*')
        .order('ral_code');
      if (error) throw error;
      return data as Color[];
    },
  });

  // Fetch popular colors (most used in production_logs)
  const { data: popularColors } = useQuery({
    queryKey: ['popular-colors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_logs')
        .select('order_item:order_items(color_id)')
        .not('order_item', 'is', null)
        .limit(100);
      
      if (error) return [];
      
      const colorCounts = new Map<string, number>();
      data?.forEach(log => {
        const colorId = (log.order_item as any)?.color_id;
        if (colorId) {
          colorCounts.set(colorId, (colorCounts.get(colorId) || 0) + 1);
        }
      });
      
      return Array.from(colorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([id]) => id);
    },
  });

  // Find matching color in database
  const findMatchingColor = (s: StructureType, g: GlossType, ral: string): Color | undefined => {
    return existingColors?.find(
      c => c.structure === s && c.gloss === g && c.ral_code === ral
    );
  };

  // Create new color mutation
  const createColorMutation = useMutation({
    mutationFn: async (newColor: { ral_code: string; structure: StructureType; gloss: GlossType; hex_code: string }) => {
      const { data, error } = await supabase
        .from('colors')
        .insert({
          ral_code: newColor.ral_code,
          structure: newColor.structure,
          gloss: newColor.gloss,
          hex_code: newColor.hex_code,
          stock_kg: 0,
          density: 1.5,
          price_per_kg: 0,
          min_stock_limit: 5,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success('Nová farba bola vytvorená');
      queryClient.invalidateQueries({ queryKey: ['colors'] });
      onChange(data.id);
      saveRecentColor(data.id);
      setRecentColorIds(getRecentColors());
      setShowCreateDialog(false);
      setPendingColor(null);
    },
    onError: (error: Error) => {
      toast.error('Chyba pri vytváraní farby: ' + error.message);
    },
  });

  // Handle selection change
  const handleSelectionChange = (newStructure: StructureType | '', newGloss: GlossType | '', newRalCode: string) => {
    setStructure(newStructure);
    setGloss(newGloss);
    setRalCode(newRalCode);

    if (newStructure && newGloss && newRalCode) {
      const match = findMatchingColor(newStructure, newGloss, newRalCode);
      if (match) {
        onChange(match.id);
        saveRecentColor(match.id);
        setRecentColorIds(getRecentColors());
      } else {
        // Color combination doesn't exist - ask to create
        const ralColor = findRALColor(newRalCode);
        setPendingColor({
          structure: newStructure,
          gloss: newGloss,
          ralCode: newRalCode,
          hexCode: ralColor?.hex || '#808080',
        });
        setShowCreateDialog(true);
      }
    }
  };

  // Handle quick selection of existing color
  const handleQuickSelect = (color: Color) => {
    setStructure(color.structure);
    setGloss(color.gloss);
    setRalCode(color.ral_code);
    onChange(color.id);
    saveRecentColor(color.id);
    setRecentColorIds(getRecentColors());
  };

  // Get selected color preview
  const selectedColor = useMemo(() => {
    if (value && existingColors) {
      return existingColors.find(c => c.id === value);
    }
    return null;
  }, [value, existingColors]);

  // Filter RAL colors by search and family
  const filteredRALColors = useMemo(() => {
    let colors = RAL_COLORS;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      colors = colors.filter(c => 
        c.code.includes(query) || 
        c.name.toLowerCase().includes(query)
      );
    }
    
    if (selectedFamily) {
      const family = RAL_FAMILIES.find(f => f.name === selectedFamily);
      if (family) {
        colors = colors.filter(c => {
          const code = parseInt(c.code);
          return code >= family.range[0] && code <= family.range[1];
        });
      }
    }
    
    return colors;
  }, [searchQuery, selectedFamily]);

  // Get recent and popular color objects
  const recentColors = useMemo(() => {
    return recentColorIds
      .map(id => existingColors?.find(c => c.id === id))
      .filter((c): c is Color => c !== undefined)
      .slice(0, 6);
  }, [recentColorIds, existingColors]);

  const popularColorObjects = useMemo(() => {
    return (popularColors || [])
      .map(id => existingColors?.find(c => c.id === id))
      .filter((c): c is Color => c !== undefined)
      .slice(0, 6);
  }, [popularColors, existingColors]);

  const selectedRalInfo = ralCode ? findRALColor(ralCode) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">Výber farby</span>
        </div>
        {selectedColor && (
          <Badge variant="outline" className="gap-2">
            <div
              className="h-3 w-3 rounded-full border"
              style={{ backgroundColor: selectedColor.hex_code || findRALColor(selectedColor.ral_code)?.hex }}
            />
            {formatRALWithName(selectedColor.ral_code, selectedColor.color_name)}
          </Badge>
        )}
      </div>

      {/* Quick selection tabs */}
      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-12">
          <TabsTrigger value="recent" className="gap-2 min-h-[48px]">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Nedávne</span>
          </TabsTrigger>
          <TabsTrigger value="popular" className="gap-2 min-h-[48px]">
            <Star className="h-4 w-4" />
            <span className="hidden sm:inline">Obľúbené</span>
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2 min-h-[48px]">
            <Grid3X3 className="h-4 w-4" />
            <span className="hidden sm:inline">Manuálne</span>
          </TabsTrigger>
        </TabsList>

        {/* Recent colors tab */}
        <TabsContent value="recent" className="mt-4">
          {recentColors.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {recentColors.map((color) => (
                <ColorQuickCard
                  key={color.id}
                  color={color}
                  isSelected={value === color.id}
                  onSelect={() => handleQuickSelect(color)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Zatiaľ žiadne nedávno použité farby</p>
            </div>
          )}
        </TabsContent>

        {/* Popular colors tab */}
        <TabsContent value="popular" className="mt-4">
          {popularColorObjects.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {popularColorObjects.map((color) => (
                <ColorQuickCard
                  key={color.id}
                  color={color}
                  isSelected={value === color.id}
                  onSelect={() => handleQuickSelect(color)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Zatiaľ žiadne obľúbené farby</p>
            </div>
          )}
        </TabsContent>

        {/* Manual selection tab */}
        <TabsContent value="manual" className="mt-4 space-y-4">
          {/* Structure and Gloss dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Štruktúra povrchu</Label>
              <Select
                value={structure}
                onValueChange={(v) => handleSelectionChange(v as StructureType, gloss, ralCode)}
              >
                <SelectTrigger className="min-h-[56px] text-base">
                  <SelectValue placeholder="Vyberte štruktúru" />
                </SelectTrigger>
                <SelectContent>
                  {STRUCTURE_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="min-h-[48px]">
                      {STRUCTURE_TYPE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Stupeň lesku</Label>
              <Select
                value={gloss}
                onValueChange={(v) => handleSelectionChange(structure, v as GlossType, ralCode)}
              >
                <SelectTrigger className="min-h-[56px] text-base">
                  <SelectValue placeholder="Vyberte lesk" />
                </SelectTrigger>
                <SelectContent>
                  {GLOSS_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g} className="min-h-[48px]">
                      {GLOSS_TYPE_LABELS[g]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* RAL Code selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">RAL kód</Label>
              <div className="flex gap-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-8 w-8 p-0"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-8 w-8 p-0"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Hľadať RAL kód alebo názov..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 min-h-[48px] text-base"
              />
            </div>

            {/* Color family filter */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedFamily === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFamily(null)}
                className="min-h-[40px]"
              >
                Všetky
              </Button>
              {RAL_FAMILIES.map((family) => (
                <Button
                  key={family.name}
                  variant={selectedFamily === family.name ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedFamily(family.name)}
                  className="min-h-[40px] gap-2"
                >
                  <div
                    className="h-3 w-3 rounded-full border border-border"
                    style={{ backgroundColor: family.color }}
                  />
                  <span className="hidden sm:inline">{family.name}</span>
                </Button>
              ))}
            </div>

            {/* RAL color grid/list */}
            <ScrollArea className="h-[280px] border rounded-lg p-2">
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {filteredRALColors.map((color) => (
                    <RALColorGridItem
                      key={color.code}
                      color={color}
                      isSelected={ralCode === color.code}
                      onSelect={() => handleSelectionChange(structure, gloss, color.code)}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredRALColors.map((color) => (
                    <RALColorListItem
                      key={color.code}
                      color={color}
                      isSelected={ralCode === color.code}
                      onSelect={() => handleSelectionChange(structure, gloss, color.code)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>

      {/* Selected color preview */}
      {selectedColor && (
        <div className="p-4 rounded-xl bg-muted/50 border-2 border-primary/20">
          <div className="flex items-center gap-4">
            <div
              className="h-16 w-16 rounded-xl border-2 border-border shadow-lg"
              style={{ backgroundColor: selectedColor.hex_code || findRALColor(selectedColor.ral_code)?.hex || '#808080' }}
            />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-xl font-mono">{formatRALWithName(selectedColor.ral_code, selectedColor.color_name)}</div>
              {selectedColor.ral_code !== 'ZAKLAD' && (
                <div className="text-sm text-muted-foreground">
                  {STRUCTURE_TYPE_LABELS[selectedColor.structure]} / {GLOSS_TYPE_LABELS[selectedColor.gloss]}
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className={cn(
                  "font-mono font-bold text-sm",
                  Number(selectedColor.stock_kg) <= Number(selectedColor.min_stock_limit) 
                    ? "text-destructive" 
                    : "text-green-600"
                )}>
                  {Number(selectedColor.stock_kg).toFixed(2)} kg
                </span>
                {Number(selectedColor.stock_kg) <= Number(selectedColor.min_stock_limit) && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Nízky stav
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warning if no selection complete */}
      {(!structure || !gloss || !ralCode) && (structure || gloss || ralCode) && (
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm font-medium">Vyberte všetky tri parametre farby</span>
        </div>
      )}

      {/* Warning when color was not confirmed after dismissing create dialog */}
      {structure && gloss && ralCode && !value && (
        <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Farba nebola vybraná</p>
            <p className="text-xs opacity-80">Kombinácia RAL {ralCode} neexistuje v evidencii. Potvrďte jej vytvorenie alebo vyberte inú farbu.</p>
          </div>
          <button
            type="button"
            onClick={() => { setStructure(''); setGloss(''); setRalCode(''); }}
            className="text-xs underline underline-offset-2 hover:no-underline flex-shrink-0"
          >
            Resetovať
          </button>
        </div>
      )}

      {/* Create new color dialog */}
      <AlertDialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              Farba nie je v evidencii
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p className="text-base">Táto kombinácia farby nie je v databáze:</p>
                {pendingColor && (
                  <div className="p-4 rounded-xl bg-muted border-2 border-border">
                    <div className="flex items-center gap-4">
                      <div
                        className="h-14 w-14 rounded-xl border-2 border-border shadow-inner"
                        style={{ backgroundColor: pendingColor.hexCode }}
                      />
                      <div>
                        <div className="font-bold font-mono text-lg text-foreground">{formatRALWithName(pendingColor.ralCode)}</div>
                        <div className="text-sm text-muted-foreground">
                          {STRUCTURE_TYPE_LABELS[pendingColor.structure]} / {GLOSS_TYPE_LABELS[pendingColor.gloss]}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <p className="text-base">Chcete ju vytvoriť s nulovým stavom skladu?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel 
              onClick={() => {
                setStructure('');
                setGloss('');
                setRalCode('');
                setPendingColor(null);
              }}
              className="min-h-[48px]"
            >
              Zrušiť
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingColor) {
                  createColorMutation.mutate({
                    ral_code: pendingColor.ralCode,
                    structure: pendingColor.structure,
                    gloss: pendingColor.gloss,
                    hex_code: pendingColor.hexCode,
                  });
                }
              }}
              disabled={createColorMutation.isPending}
              className="min-h-[48px] bg-primary"
            >
              {createColorMutation.isPending ? 'Vytvárám...' : 'Vytvoriť farbu'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Quick card component for recent/popular colors
function ColorQuickCard({ color, isSelected, onSelect }: { color: Color; isSelected: boolean; onSelect: () => void }) {
  const hexColor = color.hex_code || findRALColor(color.ral_code)?.hex || '#808080';
  const isLowStock = Number(color.stock_kg) <= Number(color.min_stock_limit);

  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative p-3 rounded-xl border-2 text-left transition-all min-h-[100px]",
        "hover:border-primary/50 hover:shadow-md active:scale-[0.98]",
        isSelected ? "border-primary bg-primary/5 shadow-md" : "border-border bg-card"
      )}
    >
      {isSelected && (
        <div className="absolute top-2 right-2">
          <Check className="h-5 w-5 text-primary" />
        </div>
      )}
      <div
        className="h-10 w-10 rounded-lg border-2 border-border shadow-sm mb-2"
        style={{ backgroundColor: hexColor }}
      />
      <div className="font-mono font-bold text-sm">{formatRALWithName(color.ral_code, color.color_name)}</div>
      <div className="text-xs text-muted-foreground truncate">
        {color.ral_code !== 'ZAKLAD' ? STRUCTURE_TYPE_LABELS[color.structure] : '—'}
      </div>
      <div className={cn(
        "text-xs font-mono mt-1",
        isLowStock ? "text-destructive" : "text-green-600"
      )}>
        {Number(color.stock_kg).toFixed(1)} kg
      </div>
      {isLowStock && (
        <AlertTriangle className="absolute bottom-2 right-2 h-4 w-4 text-destructive" />
      )}
    </button>
  );
}

// Grid item for RAL color picker
function RALColorGridItem({ color, isSelected, onSelect }: { color: RALColor; isSelected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative aspect-square rounded-lg border-2 transition-all",
        "hover:scale-110 hover:z-10 hover:shadow-lg active:scale-100",
        isSelected ? "border-primary ring-2 ring-primary/30" : "border-transparent"
      )}
      style={{ backgroundColor: color.hex }}
      title={`RAL ${color.code} - ${color.name}`}
    >
      {isSelected && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
          <Check className="h-5 w-5 text-white drop-shadow-md" />
        </div>
      )}
    </button>
  );
}

// List item for RAL color picker
function RALColorListItem({ color, isSelected, onSelect }: { color: RALColor; isSelected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left",
        "hover:bg-accent active:bg-accent/80",
        isSelected ? "bg-primary/10 border-l-4 border-primary" : ""
      )}
    >
      <div
        className="h-8 w-8 rounded-lg border border-border shadow-sm flex-shrink-0"
        style={{ backgroundColor: color.hex }}
      />
      <div className="flex-1 min-w-0">
        <div className="font-mono font-medium">RAL {color.code}</div>
        <div className="text-sm text-muted-foreground truncate">{color.name}</div>
      </div>
      {isSelected && <Check className="h-5 w-5 text-primary flex-shrink-0" />}
    </button>
  );
}
