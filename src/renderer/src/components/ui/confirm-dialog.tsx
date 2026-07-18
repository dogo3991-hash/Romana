import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog'
import { Button } from './button'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  description: string
  onConfirm: () => void
  confirming?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  description,
  onConfirm,
  confirming
}: ConfirmDialogProps): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirmar</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted">{description}</p>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={confirming}
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            {confirming ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
