import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Users, Share2 } from 'lucide-react';
import { Header } from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import backend from '~backend/client';

export function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [shareToken, setShareToken] = useState('');

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects', user?.id],
    queryFn: () => backend.projects.list({ userId: user!.id }),
    enabled: !!user,
  });

  const createProjectMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      backend.projects.create({
        name: data.name,
        description: data.description,
        userId: user!.id,
        userName: user!.name,
        userEmail: user!.email,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsCreateOpen(false);
      setProjectName('');
      setProjectDescription('');
      toast({
        title: 'Projeto criado',
        description: 'Seu projeto foi criado com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Create project error:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o projeto.',
        variant: 'destructive',
      });
    },
  });

  const joinProjectMutation = useMutation({
    mutationFn: (token: string) =>
      backend.projects.joinProject({
        shareToken: token,
        userId: user!.id,
        userName: user!.name,
        userEmail: user!.email,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsJoinOpen(false);
      setShareToken('');
      toast({
        title: 'Projeto adicionado',
        description: `Você entrou no projeto "${data.project.name}".`,
      });
    },
    onError: (error) => {
      console.error('Join project error:', error);
      toast({
        title: 'Erro',
        description: 'Token inválido ou projeto não encontrado.',
        variant: 'destructive',
      });
    },
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    createProjectMutation.mutate({
      name: projectName,
      description: projectDescription || undefined,
    });
  };

  const handleJoinProject = (e: React.FormEvent) => {
    e.preventDefault();
    joinProjectMutation.mutate(shareToken);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Meus Projetos</h1>
            <p className="text-muted-foreground">
              Gerencie seus projetos Kanban e colabore com sua equipe
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isJoinOpen} onOpenChange={setIsJoinOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Users className="mr-2 h-4 w-4" />
                  Entrar em Projeto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Entrar em Projeto</DialogTitle>
                  <DialogDescription>
                    Digite o token de compartilhamento para entrar em um projeto existente.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleJoinProject} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="shareToken">Token de Compartilhamento</Label>
                    <Input
                      id="shareToken"
                      placeholder="Cole o token aqui"
                      value={shareToken}
                      onChange={(e) => setShareToken(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={joinProjectMutation.isPending}>
                    {joinProjectMutation.isPending ? 'Entrando...' : 'Entrar no Projeto'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Projeto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Projeto</DialogTitle>
                  <DialogDescription>
                    Crie um novo projeto Kanban para organizar suas tarefas.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateProject} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Projeto</Label>
                    <Input
                      id="name"
                      placeholder="Digite o nome do projeto"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição (opcional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Descreva o projeto"
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={createProjectMutation.isPending}>
                    {createProjectMutation.isPending ? 'Criando...' : 'Criar Projeto'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects?.projects.map((project) => (
            <Card
              key={project.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/project/${project.id}`)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  {project.isShared && (
                    <Share2 className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                {project.description && (
                  <CardDescription>{project.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Criado em {new Date(project.createdAt).toLocaleDateString('pt-BR')}
                </div>
                {project.ownerId === user?.id && (
                  <div className="text-xs text-primary mt-1">Você é o administrador</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {projects?.projects.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Nenhum projeto encontrado
            </h3>
            <p className="text-muted-foreground mb-4">
              Crie seu primeiro projeto ou entre em um projeto existente usando um token.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
