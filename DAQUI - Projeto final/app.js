const express = require('express');
const app = express();
const port = 3000;
const db = require('./banco/database');
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const session=require('express-session');

app.use(session({
    secret: 'minha-chave-secreta',
    resave: false,
    saveUninitialized: false
}));

app.use((req, res, next) => {
    res.locals.usuario = req.session.usuario || null;
    res.locals.vendedor = req.session.vendedor || null;
    next();
});

const appAdmin = require('./rotas/admin');
app.use('/admin', appAdmin);

const appCarrinho = require('./rotas/rotas-carrinho');
app.use('/carrinho', appCarrinho);

const appUsuario = require('./rotas/rotas-usuario');
app.use('/usuario', appUsuario);

app.get('/', (req, res) => {
    db.all('SELECT * FROM categorias', [], (erro, categorias) => {
        if (erro) {
            console.log(erro.message);
            return res.send('Erro ao consultar categorias.');
        }
        db.all("SELECT * FROM comida WHERE destaque = 'sim'", [], (erro, comidaDestaques) => {
            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao consultar comidas em destaque.');
            }
            db.all("SELECT * FROM artesanato WHERE destaque = 'sim'", [], (erro, artesanatoDestaques) => {
                if (erro) {
                    console.log(erro.message);
                    return res.send('Erro ao consultar artesanatos em destaque.');
                }
                db.all('SELECT * FROM comida', [], (erro, comida) => {
                    if (erro) {
                        console.log(erro.message);
                        return res.send('Erro ao consultar comidas.');
                    }
                    db.all('SELECT * FROM artesanato', [], (erro, artesanato) => {
                        if (erro) {
                            console.log(erro.message);
                            return res.send('Erro ao consultar artesanato.');
                        }
                        res.render('cliente/index-cliente', { categorias, comidaDestaques, artesanatoDestaques, comida, artesanato });
                    });
                });
            });
        });
    });
});

app.get('/categoria/:id', (req, res) => {
    const categoriaId = req.params.id;

    db.get('SELECT * FROM categorias WHERE id = ?', [categoriaId], (erro, categoria) => {
        if (erro) {
            console.log(erro.message);
            return res.send('Erro ao consultar categoria.');
        }
        if (!categoria) {
            return res.status(404).send('Categoria não encontrada.');
        }

        const queryProdutos = `
            SELECT id, nome, valor, imagem, 'comida' AS tipo 
                FROM comida WHERE LOWER(categoria) = LOWER(?)
            UNION ALL
            SELECT id, nome, valor, imagem, 'artesanato' AS tipo 
                FROM artesanato WHERE LOWER(categoria) = LOWER(?)
        `;

        db.all(queryProdutos, [categoria.nome, categoria.nome], (erro, produtos) => {
            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao consultar produtos da categoria.');
            }

            db.all('SELECT * FROM categorias', [], (erroCat, categorias) => {
                const listaCategorias = erroCat ? [] : categorias;

                res.render('cliente/categoria', {
                    categoria,
                    produtos,
                    categorias: listaCategorias
                });
            });
        });
    });
});

app.get('/produto-comida/:id', (req, res) => {
    db.all('SELECT * FROM categorias', [], (erro, categorias) => {
        if (erro) {
            console.log(erro.message);
            return res.send('Erro ao consultar categorias.');
        }
        db.get('SELECT * FROM comida where id=?', [req.params.id], (erro, comida) => {
            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao consultar comida.');
            }       
            res.render('cliente/produto-cliente', {categorias, comida, artesanato:null});
        });
    });
});
app.get('/produto-artesanato/:id', (req, res) => {
    db.all('SELECT * FROM categorias', [], (erro, categorias) => {
        if (erro) {
            console.log(erro.message);
            return res.send('Erro ao consultar categorias.');
        }
        db.get('SELECT * FROM artesanato where id=?', [req.params.id], (erro, artesanato) => {
            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao consultar artesanato.');
            }       
            res.render('cliente/produto-cliente', {categorias, comida:null, artesanato});
        });
    });
});

app.get('/carrinho', (req, res) => {
    db.all('SELECT * FROM categorias', [], (erro, categorias) => {
        if (erro) {
            console.log(erro.message);
            return res.send('Erro ao consultar categorias.');
        }

                db.all('SELECT * FROM comida', [], (erro, comida) => {
                    if (erro) {
                        console.log(erro.message);
                        return res.send('Erro ao consultar comidas.');
                    }
                    db.all('SELECT * FROM artesanato', [], (erro, artesanato) => {
                        if (erro) {
                            console.log(erro.message);
                            return res.send('Erro ao consultar artesanato.');
                        }
                        res.render('cliente/carrinho', { categorias, comida, artesanato });
                    });
                });
            });
    });

app.get('/busca', (req, res) => {
    const termoBuscado = req.query.q ? req.query.q.trim() : '';

    if (!termoBuscado) {
        return res.redirect('/');
    }
    const querySQL = `
        SELECT id, nome, valor, imagem, 'comida' AS tipo FROM comida WHERE nome LIKE ?
        UNION
        SELECT id, nome, valor, imagem, 'artesanato' AS tipo FROM artesanato WHERE nome LIKE ?
    `;
    // O '%' antes e depois significa "qualquer coisa antes ou depois"
    const parametroBusca = `%${termoBuscado}%`;

    db.all(querySQL, [parametroBusca, parametroBusca], (erro, resultados) => {
        if (erro) {
            console.error("Erro na busca:", erro.message);
            return res.status(500).send('Erro ao realizar a busca.');
        }

        db.all('SELECT * FROM categorias', [], (erroCat, categorias) => {
            const listaCategorias = erroCat ? [] : categorias;
            res.render('cliente/busca', {
                produtos: resultados,
                termoBuscado: termoBuscado,
                categorias: listaCategorias
            });
        });
    });
});




app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:3000`);
});