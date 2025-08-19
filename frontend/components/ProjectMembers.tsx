import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { Trash2, Crown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import backend from '~backend/client';

interface ProjectMembersProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  isOwner: boolean;
}

export function ProjectMembers({ projectId, isOpen, onClose, isOwner }: ProjectMembersProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useQuery({
    queryKey: ['members', projectId],
    queryFn: () => backend.projects.listMembers({ projectId }),
    enabled: isOpen && !!projectId,
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) =>
      backend.projects.removeMember({
        projectId,
        memberId,
        userId: user!.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', projectId] });
      toast({
        title: 'Membro removido',
        description: 'O membro foi removido do projeto.',
      });
    },
    onError: (error) => {
      console.error('Remove member error:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o membro.',
        variant: 'destructive',
      });
    },
  });

  const handleRemoveMember = (memberId: string, memberName: string) => {
    if (confirm(`Tem certeza que deseja remover ${memberName} do projeto?`)) {
      removeMemberMutation.mutate(memberId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Membros do Projeto</DialogTitle>
          <DialogDescription>
            Gerencie os membros que têm acesso a este projeto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {members?.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {member.userName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-sm">{member.userName}</div>
                      <div className="text-xs text-muted-foreground">{member.userEmail}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Show crown icon for project owner */}
                    {/* Note: We'd need to pass project owner info to determine this */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleRemoveMember(member.id, member.userName)}
                      disabled={!isOwner || removeMemberMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {members?.members.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              Nenhum membro encontrado.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
