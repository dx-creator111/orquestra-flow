# Orquestra Flow

Plataforma independente de automação visual, com editor de fluxos, IA, atendimento e CRM.

**Estado:** construção incremental. O catálogo de blocos é extensível; integrações externas exigem credenciais próprias e nunca são simuladas como execução bem-sucedida.

## Desenvolvimento

Requer Node.js 22+ e Bun.

    bun install --frozen-lockfile
    cp .env.example .env
    bun run dev

O banco de dados utiliza PostgreSQL/Supabase. As variáveis de ambiente devem ser configuradas no servidor; não publique tokens de serviço. O código é original e não utiliza o backend da Leona.

## Verificação

    bun run build
    bun run test

A automação de CI executa ambas as tarefas em push e pull request. Os segredos nunca são armazenados no Git.
