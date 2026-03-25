import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Konfiguracia() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Konfigurácia</h1>
          <p className="text-muted-foreground">Správa cenníka, parametrov výroby a povrchových úprav</p>
        </div>

        <Tabs defaultValue="cennik">
          <TabsList>
            <TabsTrigger value="cennik">Cenník</TabsTrigger>
            <TabsTrigger value="parametre">Parametre výroby</TabsTrigger>
            <TabsTrigger value="struktury">Štruktúry a lesky</TabsTrigger>
          </TabsList>

          <TabsContent value="cennik" className="mt-6">
            <p className="text-muted-foreground">Sekcia sa načítava...</p>
          </TabsContent>

          <TabsContent value="parametre" className="mt-6">
            <p className="text-muted-foreground">Sekcia sa načítava...</p>
          </TabsContent>

          <TabsContent value="struktury" className="mt-6">
            <p className="text-muted-foreground">Sekcia sa načítava...</p>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
