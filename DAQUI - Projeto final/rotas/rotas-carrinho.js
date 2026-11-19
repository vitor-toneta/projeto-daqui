const express = require('express');
const appCarrinho = express();
const db = require('../banco/database');

// Garante a estrutura da sessão
function obterCarrinho(req) {
    if (!req.session) {
        req.session = {};
    }
    if (!req.session.carrinho) {
        req.session.carrinho = [];
    }
    return req.session.carrinho;
}

// Busca produtos por IDs (função reutilizável)
function buscarProdutos(tabela, ids, callback) {
    if (!ids || ids.length === 0) {
        return callback(null, []);
    }
    const marcadores = ids.map(() => '?').join(', ');
    db.all(
        `SELECT * FROM ${tabela} WHERE id IN (${marcadores})`,
        ids,
        callback
    );
}

// ==================== VER CARRINHO ====================
appCarrinho.get('/', (req, res) => {
    const carrinho = obterCarrinho(req);

    const idsComida = carrinho
        .filter(item => item.idcomida)
        .map(item => item.idcomida);

    const idsArtesanato = carrinho
        .filter(item => item.idartesanato)
        .map(item => item.idartesanato);

    buscarProdutos('comida', idsComida, (erroComida, comidasBanco) => {
        if (erroComida) {
            console.error('Erro ao buscar comida:', erroComida.message);
            return res.status(500).send('Erro ao consultar o carrinho.');
        }

        buscarProdutos('artesanato', idsArtesanato, (erroArtesanato, artesanatosBanco) => {
            if (erroArtesanato) {
                console.error('Erro ao buscar artesanato:', erroArtesanato.message);
                return res.status(500).send('Erro ao consultar o carrinho.');
            }

            db.all('SELECT * FROM categorias', [], (erroCategorias, categorias) => {
                const listaCategorias = erroCategorias ? [] : categorias;
                if (erroCategorias) {
                    console.log("Aviso: Tabela 'categorias' não encontrada ou vazia.");
                }

                const itens = [];

                carrinho.forEach(item => {
                    if (item.idcomida) {
                        const comidaEncontrada = comidasBanco.find(
                            comida => comida.id === item.idcomida
                        );
                        if (comidaEncontrada) {
                            itens.push({
                                tipo: 'comida',
                                produto: comidaEncontrada,
                                quantidade: item.quantidade,
                                subtotal: (comidaEncontrada.valor || 0) * item.quantidade
                            });
                        }
                    } else if (item.idartesanato) {
                        const artesanatoEncontrado = artesanatosBanco.find(
                            artesanato => artesanato.id === item.idartesanato
                        );
                        if (artesanatoEncontrado) {
                            itens.push({
                                tipo: 'artesanato',
                                produto: artesanatoEncontrado,
                                quantidade: item.quantidade,
                                subtotal: (artesanatoEncontrado.valor || 0) * item.quantidade
                            });
                        }
                    }
                });

                const total = itens.reduce(
                    (soma, item) => soma + item.subtotal,
                    0
                );
                const totalItens = itens.reduce(
                    (soma, item) => soma + item.quantidade,
                    0
                );

                req.session.total = total;

                res.render('cliente/carrinho', {
                    itens,
                    total,
                    totalItens,
                    categorias: listaCategorias
                });
            });
        });
    });
});

// ==================== ADICIONAR COMIDA ====================
appCarrinho.post('/adicionarComida/:id', (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        return res.redirect('/carrinho');
    }

    db.get(
        'SELECT id FROM comida WHERE id = ?',
        [id],
        (erro, comidaEncontrada) => {
            if (erro) {
                console.error('Erro ao verificar comida:', erro.message);
                return res.status(500).send('Erro ao adicionar ao carrinho.');
            }
            if (!comidaEncontrada) {
                return res.status(404).send('Produto não encontrado.');
            }

            const carrinho = obterCarrinho(req);
            const itemNoCarrinho = carrinho.find(
                item => item.idcomida === id
            );

            if (itemNoCarrinho) {
                itemNoCarrinho.quantidade += 1;
            } else {
                carrinho.push({ idcomida: id, quantidade: 1 });
            }

            res.redirect('/carrinho');
        }
    );
});

// ==================== ADICIONAR ARTESANATO ====================
appCarrinho.post('/adicionarArtesanato/:id', (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        return res.redirect('/carrinho');
    }

    db.get(
        'SELECT id FROM artesanato WHERE id = ?',
        [id],
        (erro, artesanatoEncontrado) => {
            if (erro) {
                console.error('Erro ao verificar artesanato:', erro.message);
                return res.status(500).send('Erro ao adicionar ao carrinho.');
            }
            if (!artesanatoEncontrado) {
                return res.status(404).send('Produto não encontrado.');
            }

            const carrinho = obterCarrinho(req);
            const itemNoCarrinho = carrinho.find(
                item => item.idartesanato === id
            );

            if (itemNoCarrinho) {
                itemNoCarrinho.quantidade += 1;
            } else {
                carrinho.push({ idartesanato: id, quantidade: 1 });
            }

            res.redirect('/carrinho');
        }
    );
});

// ==================== ADICIONAR GENÉRICO ====================
// Detecta automaticamente se o ID pertence a comida ou artesanato.
// Usado pelos botões "+" na página do carrinho.
appCarrinho.post('/adicionar/:tipo/:id', (req, res) => {
    const tipo = req.params.tipo;
    const id = parseInt(req.params.id);

    if (isNaN(id) || (tipo !== 'comida' && tipo !== 'artesanato')) {
        return res.redirect('/carrinho');
    }

    const carrinho = obterCarrinho(req);

    let itemNoCarrinho;
    if (tipo === 'comida') {
        itemNoCarrinho = carrinho.find(item => item.idcomida === id);
    } else {
        itemNoCarrinho = carrinho.find(item => item.idartesanato === id);
    }

    if (itemNoCarrinho) {
        itemNoCarrinho.quantidade += 1;
        return res.redirect('/carrinho');
    }

    // Não está no carrinho → valida se existe no banco antes de adicionar
    const tabela = tipo === 'comida' ? 'comida' : 'artesanato';

    db.get(
        `SELECT id FROM ${tabela} WHERE id = ?`,
        [id],
        (erro, produtoEncontrado) => {
            if (erro) {
                console.error(`Erro ao verificar ${tipo}:`, erro.message);
                return res.status(500).send('Erro ao adicionar ao carrinho.');
            }
            if (!produtoEncontrado) {
                return res.status(404).send('Produto não encontrado.');
            }

            if (tipo === 'comida') {
                carrinho.push({ idcomida: id, quantidade: 1 });
            } else {
                carrinho.push({ idartesanato: id, quantidade: 1 });
            }

            res.redirect('/carrinho');
        }
    );
});

// ==================== DIMINUIR QUANTIDADE ====================
appCarrinho.post('/diminuir/:tipo/:id', (req, res) => {
    const tipo = req.params.tipo;
    const id = parseInt(req.params.id);

    if (isNaN(id) || (tipo !== 'comida' && tipo !== 'artesanato')) {
        return res.redirect('/carrinho');
    }

    const carrinho = obterCarrinho(req);

    let itemNoCarrinho;
    if (tipo === 'comida') {
        itemNoCarrinho = carrinho.find(item => item.idcomida === id);
    } else {
        itemNoCarrinho = carrinho.find(item => item.idartesanato === id);
    }

    if (itemNoCarrinho) {
        itemNoCarrinho.quantidade -= 1;

        if (itemNoCarrinho.quantidade <= 0) {
            if (tipo === 'comida') {
                req.session.carrinho = carrinho.filter(
                    item => item.idcomida !== id
                );
            } else {
                req.session.carrinho = carrinho.filter(
                    item => item.idartesanato !== id
                );
            }
        }
    }

    res.redirect('/carrinho');
});

// ==================== REMOVER ====================
appCarrinho.post('/remover/:tipo/:id', (req, res) => {
    const tipo = req.params.tipo;
    const id = parseInt(req.params.id);

    if (isNaN(id) || (tipo !== 'comida' && tipo !== 'artesanato')) {
        return res.redirect('/carrinho');
    }

    const carrinho = obterCarrinho(req);

    if (tipo === 'comida') {
        req.session.carrinho = carrinho.filter(
            item => item.idcomida !== id
        );
    } else {
        req.session.carrinho = carrinho.filter(
            item => item.idartesanato !== id
        );
    }

    res.redirect('/carrinho');
});

// ==================== ESVAZIAR ====================
appCarrinho.post('/limpar', (req, res) => {
    req.session.carrinho = [];
    res.redirect('/carrinho');
});

module.exports = appCarrinho;