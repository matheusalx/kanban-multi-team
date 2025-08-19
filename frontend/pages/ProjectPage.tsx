import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Share2, Users, Activity, Trash2, Edit, Clock, User } from 'lucide-react';
import { Header } from '../components/Header';
import { ProjectMembers } from '../components/ProjectMembers';
import { ProjectActivity } from '../components/ProjectActivity';
import { ActivitySidebar } from '../components/ActivitySidebar';
import { useAuth } from '../contexts/AuthContext';
import backend from '~backend/client';
import type { Card as CardType } from '~backend/kanban/cards';

export function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isCreateCardOpen, setIsCreateCardOpen] = useState(false);
  const [isEditCardOpen, setIsEditCardOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [cardTitle, setCardTitle] = useState('');
  const [cardDescription, setCardDescription] = useState('');
  const [shareToken, setShareToken] = useState('');

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => backend.projects.list({ userId: user!.id }).then(res => 
      res.projects.find(p => p.id === projectId)
    ),
    enabled: !!projectId && !!user,
  });

  const { data: boards } = useQuery({
    queryKey: ['boards', projectId],
    queryFn: () => backend.kanban.getBoards({ projectId: projectId! }),
    enabled: !!projectId,
  });

  const { data: cards } = useQuery({
    queryKey: ['cards', projectId],
    queryFn: () => backend.kanban.getCards({ projectId: projectId! }),
    enabled: !!projectId,
  });

  const createCardMutation = useMutation({
    mutationFn: (data: { boardId: string; title: string; description?: string; status: string }) =>
      backend.kanban.createCard({
        boardId: data.boardId,
        title: data.title,
        description: data.description,
        status: data.status,
        userId: user!.id,
        userName: user!.name,
        userEmail: user!.email,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', projectId] });
      queryClient.invalidateQueries({ queryKey: ['activity', projectId] });
      setIsCreateCardOpen(false);
      setCardTitle('');
      setCardDescription('');
    },
  });

  const updateCardMutation = useMutation({
    mutationFn: (data: { cardId: string; title?: string; description?: string; status?: string; position?: number }) =>
      backend.kanban.updateCard({
        cardId: data.cardId,
        title: data.title,
        description: data.description,
        status: data.status,
        position: data.position,
        userId: user!.id,
        userName: user!.name,
        userEmail: user!.email,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', projectId] });
      queryClient.invalidateQueries({ queryKey: ['activity', projectId] });
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: (cardId: string) =>
      backend.kanban.deleteCard({
        cardId,
        userId: user!.id,
        userName: user!.name,
        userEmail: user!.email,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', projectId] });
      queryClient.invalidateQueries({ queryKey: ['activity', projectId] });
    },
  });

  const enableSharingMutation = useMutation({
    mutationFn: () =>
      backend.projects.enableSharing({
        projectId: projectId!,
        userId: user!.id,
      }),
    onSuccess: (data) => {
      setShareToken(data.shareToken);
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast({
        title: 'Compartilhamento ativado',
        description: 'Token de compartilhamento gerado com sucesso.',
      });
    },
  });

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Find the "A Fazer" board
    const todoBoard = boards?.boards.find(b => b.name === 'A Fazer');
    if (!todoBoard) return;

    createCardMutation.mutate({
      boardId: todoBoard.id,
      title: cardTitle,
      description: cardDescription || undefined,
      status: 'todo',
    });
  };

  const handleEditCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCard) return;

    updateCardMutation.mutate({
      cardId: selectedCard.id,
      title: cardTitle,
      description: cardDescription || undefined,
    });

    setIsEditCardOpen(false);
    setSelectedCard(null);
    setCardTitle('');
    setCardDescription('');
  };

  const handleDeleteCard = (cardId: string) => {
    if (confirm('Tem certeza que deseja excluir este card?')) {
      deleteCardMutation.mutate(cardId);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !cards) return;

    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const card = cards.cards.find(c => c.id === draggableId);
    if (!card) return;

    const newStatus = destination.droppableId === 'todo' ? 'todo' :
                     destination.droppableId === 'in-progress' ? 'in-progress' : 'done';

    updateCardMutation.mutate({
      cardId: draggableId,
      status: newStatus,
      position: destination.index,
    });
  };

  const openEditCard = (card: CardType) => {
    setSelectedCard(card);
    setCardTitle(card.title);
    setCardDescription(card.description || '');
    setIsEditCardOpen(true);
  };

  const getCardsByStatus = (status: string) => {
    return cards?.cards.filter(card => card.status === status) || [];
  };

  const copyShareToken = () => {
    navigator.clipboard.writeText(shareToken || project?.shareToken || '');
    toast({
      title: 'Token copiado',
      description: 'Token de compartilhamento copiado para a área de transferência.',
    });
  };

  const getBoardColors = (boardName: string) => {
    switch (boardName) {
      case 'A Fazer':
        return {
          header: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800',
          title: 'text-red-800 dark:text-red-200',
          badge: 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200',
          border: 'border-red-300 dark:border-red-700',
          dragOver: 'border-red-500 bg-red-50 dark:bg-red-900/20'
        };
      case 'Em Andamento':
        return {
          header: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800',
          title: 'text-yellow-800 dark:text-yellow-200',
          badge: 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200',
          border: 'border-yellow-300 dark:border-yellow-700',
          dragOver: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
        };
      case 'Concluído':
        return {
          header: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800',
          title: 'text-green-800 dark:text-green-200',
          badge: 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200',
          border: 'border-green-300 dark:border-green-700',
          dragOver: 'border-green-500 bg-green-50 dark:bg-green-900/20'
        };
      default:
        return {
          header: 'bg-gray-100 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800',
          title: 'text-gray-800 dark:text-gray-200',
          badge: 'bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
          border: 'border-gray-300 dark:border-gray-700',
          dragOver: 'border-gray-500 bg-gray-50 dark:bg-gray-900/20'
        };
    }
  };

  if (!project) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Projeto não encontrado</div>
        </div>
      </div>
    );
  }

  const isOwner = project.ownerId === user?.id;

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="text-muted-foreground mt-1">{project.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsActivityOpen(true)}>
              <Activity className="mr-2 h-4 w-4" />
              Atividade
            </Button>
            <Button variant="outline" onClick={() => setIsMembersOpen(true)}>
              <Users className="mr-2 h-4 w-4" />
              Membros
            </Button>
            {isOwner && (
              <Button
                variant="outline"
                onClick={() => {
                  if (project.shareToken) {
                    setShareToken(project.shareToken);
                  } else {
                    enableSharingMutation.mutate();
                  }
                }}
              >
                <Share2 className="mr-2 h-4 w-4" />
                {project.isShared ? 'Ver Token' : 'Compartilhar'}
              </Button>
            )}
          </div>
        </div>

        <div className="flex gap-6">
          {/* Kanban Boards */}
          <div className="flex-1">
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {boards?.boards.map((board) => {
                  const status = board.name === 'A Fazer' ? 'todo' : 
                               board.name === 'Em Andamento' ? 'in-progress' : 'done';
                  const boardCards = getCardsByStatus(status);
                  const isTodoBoard = board.name === 'A Fazer';
                  const colors = getBoardColors(board.name);

                  return (
                    <div key={board.id} className="space-y-4">
                      <div className={`p-4 rounded-lg border ${colors.header}`}>
                        <div className="flex items-center justify-between">
                          <h2 className={`text-lg font-semibold ${colors.title}`}>{board.name}</h2>
                          <div className="flex items-center gap-2">
                            <Badge className={colors.badge}>{boardCards.length}</Badge>
                            {isTodoBoard && (
                              <Button 
                                size="sm" 
                                onClick={() => setIsCreateCardOpen(true)}
                                className="h-8"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Novo Card
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <Droppable droppableId={status}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`min-h-[200px] space-y-3 p-4 rounded-lg border-2 border-dashed transition-colors ${
                              snapshot.isDraggingOver 
                                ? colors.dragOver
                                : colors.border
                            }`}
                          >
                            {boardCards.map((card, index) => (
                              <Draggable key={card.id} draggableId={card.id} index={index}>
                                {(provided, snapshot) => (
                                  <Card
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`cursor-move transition-shadow ${
                                      snapshot.isDragging ? 'shadow-lg' : 'hover:shadow-md'
                                    }`}
                                  >
                                    <CardHeader className="pb-2">
                                      <div className="flex items-start justify-between">
                                        <CardTitle className="text-sm font-medium">
                                          {card.title}
                                        </CardTitle>
                                        <div className="flex gap-1">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openEditCard(card);
                                            }}
                                          >
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-destructive"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteCard(card.id);
                                            }}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    </CardHeader>
                                    {card.description && (
                                      <CardContent className="pt-0">
                                        <p className="text-xs text-muted-foreground">
                                          {card.description}
                                        </p>
                                      </CardContent>
                                    )}
                                    <CardContent className="pt-0">
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <User className="h-3 w-3" />
                                        <span>{card.createdByName}</span>
                                        <Clock className="h-3 w-3 ml-2" />
                                        <span>{new Date(card.createdAt).toLocaleDateString('pt-BR')}</span>
                                      </div>
                                    </CardContent>
                                  </Card>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}
              </div>
            </DragDropContext>
          </div>

          {/* Activity Sidebar */}
          <ActivitySidebar projectId={projectId!} />
        </div>

        {/* Create Card Dialog */}
        <Dialog open={isCreateCardOpen} onOpenChange={setIsCreateCardOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Card</DialogTitle>
              <DialogDescription>
                Adicione um novo card ao quadro "A Fazer".
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCard} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  placeholder="Digite o título do card"
                  value={cardTitle}
                  onChange={(e) => setCardTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva o card"
                  value={cardDescription}
                  onChange={(e) => setCardDescription(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={createCardMutation.isPending}>
                {createCardMutation.isPending ? 'Criando...' : 'Criar Card'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Card Dialog */}
        <Dialog open={isEditCardOpen} onOpenChange={setIsEditCardOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Card</DialogTitle>
              <DialogDescription>
                Atualize as informações do card.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditCard} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editTitle">Título</Label>
                <Input
                  id="editTitle"
                  placeholder="Digite o título do card"
                  value={cardTitle}
                  onChange={(e) => setCardTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDescription">Descrição (opcional)</Label>
                <Textarea
                  id="editDescription"
                  placeholder="Descreva o card"
                  value={cardDescription}
                  onChange={(e) => setCardDescription(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={updateCardMutation.isPending}>
                {updateCardMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Share Token Dialog */}
        {(shareToken || project.shareToken) && (
          <Dialog open={!!shareToken} onOpenChange={() => setShareToken('')}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Token de Compartilhamento</DialogTitle>
                <DialogDescription>
                  Compartilhe este token com sua equipe para que possam entrar no projeto.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <code className="text-sm break-all">
                    {shareToken || project.shareToken}
                  </code>
                </div>
                <Button onClick={copyShareToken} className="w-full">
                  Copiar Token
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Project Members Dialog */}
        <ProjectMembers
          projectId={projectId!}
          isOpen={isMembersOpen}
          onClose={() => setIsMembersOpen(false)}
          isOwner={isOwner}
        />

        {/* Project Activity Dialog */}
        <ProjectActivity
          projectId={projectId!}
          isOpen={isActivityOpen}
          onClose={() => setIsActivityOpen(false)}
        />
      </div>
    </div>
  );
}
