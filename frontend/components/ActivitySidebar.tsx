import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, User, GitCommit, Plus, Edit, Trash2, ArrowRight } from 'lucide-react';
import backend from '~backend/client';

interface ActivitySidebarProps {
  projectId: string;
}

export function ActivitySidebar({ projectId }: ActivitySidebarProps) {
  const { data: activity, isLoading } = useQuery({
    queryKey: ['activity', projectId],
    queryFn: () => backend.activity.getActivity({ projectId, limit: 20 }),
    enabled: !!projectId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <Plus className="h-3 w-3" />;
      case 'updated':
        return <Edit className="h-3 w-3" />;
      case 'deleted':
        return <Trash2 className="h-3 w-3" />;
      case 'joined':
        return <ArrowRight className="h-3 w-3" />;
      default:
        return <GitCommit className="h-3 w-3" />;
    }
  };

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
          if (details?.status) {
            const statusMap: { [key: string]: string } = {
              'todo': 'A Fazer',
              'in-progress': 'Em Andamento',
              'done': 'Concluído'
            };
            const fromStatus = statusMap[details.status.from] || details.status.from;
            const toStatus = statusMap[details.status.to] || details.status.to;
            changes.push(`status (${fromStatus} → ${toStatus})`);
          }
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

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'agora mesmo';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}min atrás`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h atrás`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d atrás`;
    }
  };

  return (
    <Card className="w-80 h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <GitCommit className="h-5 w-5" />
          Atividade Recente
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-1">
              {activity?.activities.map((item) => (
                <div key={item.id} className="p-3 border-b border-border/50 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-6 w-6 mt-0.5">
                      <AvatarFallback className="text-xs">
                        {item.userName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">{item.userName}</span>
                        <Badge variant="outline" className={`text-xs px-1.5 py-0.5 ${getActionColor(item.action)}`}>
                          <span className="flex items-center gap-1">
                            {getActionIcon(item.action)}
                            {item.action}
                          </span>
                        </Badge>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                        {getActionText(item.action, item.entityType, item.details)}
                      </p>
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatTimeAgo(item.createdAt)}</span>
                        <span className="mx-1">•</span>
                        <span>{new Date(item.createdAt).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activity?.activities.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <GitCommit className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma atividade registrada ainda.</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
