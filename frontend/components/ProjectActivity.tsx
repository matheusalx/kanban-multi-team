import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import backend from '~backend/client';

interface ProjectActivityProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectActivity({ projectId, isOpen, onClose }: ProjectActivityProps) {
  const { data: activity, isLoading } = useQuery({
    queryKey: ['activity', projectId],
    queryFn: () => backend.activity.getActivity({ projectId, limit: 50 }),
    enabled: isOpen && !!projectId,
  });

  const getActionText = (action: string, entityType: string, details?: any) => {
    switch (action) {
      case 'created':
        if (entityType === 'project') return 'criou o projeto';
        if (entityType === 'card') return `criou o card "${details?.title}"`;
        return `criou ${entityType}`;
      case 'updated':
        if (entityType === 'card') {
          const changes = [];
          if (details?.title) changes.push('título');
          if (details?.description) changes.push('descrição');
          if (details?.status) changes.push('status');
          if (details?.position) changes.push('posição');
          return `atualizou ${changes.join(', ')} do card`;
        }
        return `atualizou ${entityType}`;
      case 'deleted':
        if (entityType === 'card') return `excluiu o card "${details?.title}"`;
        return `excluiu ${entityType}`;
      case 'joined':
        return 'entrou no projeto';
      case 'removed_member':
        return `removeu ${details?.removedUser} do projeto`;
      default:
        return action;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'updated':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'deleted':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'joined':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Atividade do Projeto</DialogTitle>
          <DialogDescription>
            Histórico de todas as ações realizadas no projeto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {activity?.activities.map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarFallback>
                      {item.userName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{item.userName}</span>
                      <Badge variant="outline" className={`text-xs ${getActionColor(item.action)}`}>
                        {item.action}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {getActionText(item.action, item.entityType, item.details)}
                    </p>
                    
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(item.createdAt).toLocaleString('pt-BR')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activity?.activities.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma atividade registrada ainda.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
