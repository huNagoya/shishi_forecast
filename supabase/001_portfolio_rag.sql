-- 1. 启用 pgvector 扩展
create extension if not exists vector;

-- 2. 创建知识库表（1024 维向量，对应阿里云 text-embedding-v3）
create table if not exists portfolio_docs (
  id          bigserial primary key,
  chunk_id    text unique not null,       -- 唯一标识符，用于 upsert
  content     text not null,             -- 原始文本片段
  embedding   vector(1024),              -- 向量
  metadata    jsonb default '{}'         -- 可选元数据（section、feature 等）
);

-- 3. 公开只读数据，禁用 RLS（作品集内容无需保护）
alter table portfolio_docs disable row level security;

-- 4. 授予 anon 角色查询和写入权限（入库脚本用 anon key）
grant select, insert, update on portfolio_docs to anon;
grant usage, select on sequence portfolio_docs_id_seq to anon;

-- 5. HNSW 索引（比 IVFFlat 更适合小数据集，查询快且无需提前 vacuum）
create index if not exists portfolio_docs_embedding_hnsw
  on portfolio_docs using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- 6. 向量相似度检索函数（供 API route 调用）
create or replace function match_portfolio_docs(
  query_embedding  vector(1024),
  match_count      int     default 3,
  min_similarity   float   default 0.45
)
returns table (
  id          bigint,
  chunk_id    text,
  content     text,
  metadata    jsonb,
  similarity  float
)
language sql stable
as $$
  select
    id,
    chunk_id,
    content,
    metadata,
    1 - (embedding <=> query_embedding) as similarity
  from portfolio_docs
  where 1 - (embedding <=> query_embedding) > min_similarity
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- 7. 授予 anon 执行检索函数的权限
grant execute on function match_portfolio_docs to anon;
