'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// Stage prop for explaining where cards come from: both buttons only close it.
export function NewCardDialog() {
  return (
    <Dialog>
      <DialogTrigger
        render={<Button variant="ghost" size="icon-xs" aria-label="New card" data-testid="new-card" />}
      >
        <Plus />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New card</DialogTitle>
          <DialogDescription>
            Describe the feature. Once it moves to To do, the Builder picks it up.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="new-card-title">Title</Label>
            <Input id="new-card-title" placeholder="Rate limit per workspace" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="new-card-notes">Notes</Label>
            <Textarea
              id="new-card-notes"
              rows={4}
              className="max-h-40"
              placeholder="Cap generations at 20 per workspace per day. Show the remaining count in the composer."
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <DialogClose render={<Button />}>Add to Draft</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
