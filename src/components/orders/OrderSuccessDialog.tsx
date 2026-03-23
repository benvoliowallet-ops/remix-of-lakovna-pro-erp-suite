import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Printer, ArrowRight, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OrderSuccessDialogProps {
  open: boolean;
  orderId: number;
  onClose: () => void;
}

export function OrderSuccessDialog({ open, orderId, onClose }: OrderSuccessDialogProps) {
  const navigate = useNavigate();

  const handlePrintProtocol = () => {
    navigate(`/zakazky/${orderId}/protokol/prijimaci`);
  };

  const handleGoToOrder = () => {
    navigate(`/zakazky/${orderId}`);
  };

  const handleCreateNew = () => {
    onClose();
    // Reset form would happen in parent, just close dialog
    window.location.href = '/zakazky/nova';
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-10 w-10 text-success" />
          </div>
          <DialogTitle className="text-2xl">Zákazka #{orderId} uložená</DialogTitle>
          <DialogDescription>
            Zákazka bola úspešne vytvorená a uložená do systému.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-6 space-y-3">
          <Button 
            onClick={handlePrintProtocol} 
            className="w-full h-14 text-lg bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Printer className="mr-2 h-5 w-5" />
            Tlačiť prijímací protokol
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleGoToOrder}
            className="w-full h-12"
          >
            <ArrowRight className="mr-2 h-4 w-4" />
            Pokračovať na zákazku
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={handleCreateNew}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Vytvoriť ďalšiu zákazku
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
