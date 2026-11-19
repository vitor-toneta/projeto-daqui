
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./banco/ecommerce.db', (erro) => {
    if (erro) {
        console.log(erro.message);
    } else {
        console.log('Banco conectado.');
    }
});

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS categorias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            descricao TEXT
        );
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS artesanato (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_vendedor INTEGER,
            nome TEXT NOT NULL,
            categoria TEXT,
            valor FLOAT,
            estoque INTEGER DEFAULT 0,
            descricao TEXT,
            peso FLOAT,
            destaque TEXT,
            imagem TEXT
            
        );
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS comida (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_vendedor INTEGER,
            nome TEXT NOT NULL,
            categoria TEXT,
            valor FLOAT,
            estoque INTEGER DEFAULT 0,
            descricao TEXT,
            validade DATE,
            peso FLOAT,
            destaque TEXT,
            imagem TEXT
        );
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            cpf TEXT NOT NULL UNIQUE,
            senha TEXT NOT NULL,
            endereco TEXT,
            cidade TEXT,
            telefone TEXT,
            foto TEXT

        );

    `);

    db.run(`
    CREATE TABLE IF NOT EXISTS vendedores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome_empresa TEXT NOT NULL,
        nome_responsavel TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        cpf TEXT NOT NULL UNIQUE,      
        senha TEXT NOT NULL,
        endereco TEXT,
        cidade TEXT,
        telefone TEXT,
        foto TEXT
    );
`);

});

module.exports = db;