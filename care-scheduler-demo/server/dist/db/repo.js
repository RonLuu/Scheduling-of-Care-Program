const usePostgres = !!process.env.DATABASE_URL?.startsWith('postgres://');
export let repo;
if (usePostgres) {
    const { pgRepo } = await import('./drivers/postgres.js');
    repo = pgRepo;
}
else {
    const { sqliteRepo } = await import('./drivers/sqlite.js');
    repo = sqliteRepo;
}
