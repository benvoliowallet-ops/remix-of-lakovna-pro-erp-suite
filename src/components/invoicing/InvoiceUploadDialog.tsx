import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, FileText, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import type { InvoiceOrder } from '@/pages/Invoicing';

interface InvoiceUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: InvoiceOrder;
  onSuccess: () => void;
}

export function InvoiceUploadDialog({ 
  open, 
  onOpenChange, 
  order, 
  onSuccess 
}: InvoiceUploadDialogProps) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [dueDate, setDueDate] = useState<string>(
    order.due_date || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Vyberte súbor');

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `invoice_${order.id}_${Date.now()}.${fileExt}`;
      const filePath = `${order.id}/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Store the file path (not public URL) for signed URL generation
      // The bucket is now private, so we store the path and generate signed URLs when needed
      const storedPath = filePath;

      // Update order with invoice path (we'll generate signed URLs when displaying)
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          invoice_url: storedPath,
          due_date: dueDate,
        })
        .eq('id', order.id);

      if (updateError) throw updateError;

      return storedPath;
    },
    onSuccess: () => {
      toast.success('Faktúra bola úspešne nahratá');
      queryClient.invalidateQueries({ queryKey: ['invoicing-orders'] });
      onSuccess();
      onOpenChange(false);
      setFile(null);
    },
    onError: (error) => {
      toast.error('Chyba pri nahrávaní: ' + error.message);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        toast.error('Prosím vyberte PDF súbor');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('Súbor je príliš veľký (max 10MB)');
        return;
      }
      setFile(selectedFile);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Nahrať faktúru
          </DialogTitle>
          <DialogDescription>
            Zákazka #{order.id} - {order.customer?.name || 'Bez zákazníka'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File upload */}
          <div className="space-y-2">
            <Label htmlFor="invoice-file">PDF súbor faktúry</Label>
            <div className="flex items-center gap-2">
              <Input
                id="invoice-file"
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
            </div>
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{file.name}</span>
                <span className="text-xs">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}
          </div>

          {/* Due date */}
          <div className="space-y-2">
            <Label htmlFor="due-date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Dátum splatnosti
            </Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Môžete upraviť automaticky vypočítaný dátum splatnosti
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploadMutation.isPending}
          >
            Zrušiť
          </Button>
          <Button
            onClick={() => uploadMutation.mutate()}
            disabled={!file || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Nahrávam...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Nahrať faktúru
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
