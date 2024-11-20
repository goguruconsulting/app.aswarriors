import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NewEntryForm } from '@/components/pain/NewEntryForm';
import { PainEntriesTable } from '@/components/pain/PainEntriesTable';

export function Dashboard() {
  const [showNewEntryDialog, setShowNewEntryDialog] = useState(false);

  return (
    <main className="flex-1 container mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setShowNewEntryDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Pain Entry
        </Button>
      </div>

      <PainEntriesTable />

      <Dialog open={showNewEntryDialog} onOpenChange={setShowNewEntryDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>New Pain Entry</DialogTitle>
          </DialogHeader>
          <NewEntryForm onSuccess={() => setShowNewEntryDialog(false)} />
        </DialogContent>
      </Dialog>
    </main>
  );
}