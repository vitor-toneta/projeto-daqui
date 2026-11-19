const express = require('express');
const appAdmin = express();
const db = require('../banco/database');
const upload = require('../util/imagens');
const bcrypt = require('bcryptjs');

function exigirVendedor(req, res, next) {
    if (!req.session.vendedor) {
        return res.redirect('/admin/login'); 
    }
    next();
}

appAdmin.get('/index', exigirVendedor, (req, res) => {
    res.render('admin/index-admin');
});

appAdmin.get('/login', (req, res) => {
    res.render('admin/login', { 
        titulo: 'Login do Vendedor',
        erro: null,
        sucesso: req.query.cadastro === 'ok' // Passa o aviso de sucesso para a tela
    });
});

appAdmin.get('/escolher-cadastro', (req, res) => {
    res.render('usuario/escolher-cadastro');
});



appAdmin.post('/login', (req, res) => {
    const email = (req.body.email || '').trim().toLowerCase();
    const senha = req.body.senha || '';

    function mostrarErro(mensagem) {
        res.render('admin/login', { 
            titulo: 'Login do Vendedor',
            erro: mensagem,
            email: email
        });
    }
    db.get('SELECT * FROM vendedores WHERE email = ?', [email], function (erro, vendedor) {
        if (erro) {
            console.log(erro.message);
            return mostrarErro('Erro ao consultar vendedor.');
        }
        if (!vendedor || !bcrypt.compareSync(senha, vendedor.senha)) {
            return mostrarErro('E-mail ou senha inválidos.');
        }
        req.session.regenerate(function (erro) {
            if (erro) return mostrarErro('Erro ao iniciar sessão.');
            req.session.vendedor = { 
                id: vendedor.id, 
                nome: vendedor.nome_responsavel, 
                empresa: vendedor.nome_empresa,
                foto: vendedor.foto
            };

            req.session.save(function (erro) {
                if (erro) return res.status(500).send('Erro ao salvar sessão.');
                res.redirect('/admin/index'); 
            });
        });
    });
});



//================== ROTAS DE CATEGORIAS ==================//
appAdmin.get('/categorias', exigirVendedor, (req, res) => {
    db.all(
        'SELECT * FROM categorias', 
        [], 
        function (erro, categorias) {
            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao consultar categorias.');
            }
            res.render('admin/categorias/lista', { categorias });
        }
    );
});

appAdmin.get('/categorias/form-cadastrar', exigirVendedor, (req, res) => {
    res.render('admin/categorias/cadastro');
});

appAdmin.post('/categorias/cadastrar', (req, res) => {
    const nome = req.body.nome;
    const descricao = req.body.descricao;

    db.run(
        `INSERT INTO categorias (nome, descricao) VALUES (?, ?)`,
        [nome, descricao],
        function (erro) {
            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao cadastrar categoria.');
            }
            res.redirect('/admin/categorias');
        }
    );
});

//================== ROTAS DE PRODUTOS ==================//

appAdmin.get('/comida', exigirVendedor, (req, res) => {
    const id_vendedor = req.session.vendedor.id;

    // O WHERE filtra para trazer só os produtos deste vendedor
    db.all('SELECT * FROM comida WHERE id_vendedor = ?' , [id_vendedor], function (erro, comida) {
        if (erro) {
            console.log(erro.message);
            return res.send('Erro ao consultar comida.');
        }
        res.render('admin/comida/lista', { comida });
    });
});

appAdmin.get('/artesanato', exigirVendedor, (req, res) => {
    const id_vendedor = req.session.vendedor.id;

    db.all('SELECT * FROM artesanato WHERE id_vendedor = ?', [id_vendedor], function (erro, artesanato) {
        if (erro) {
            console.log(erro.message);
            return res.send('Erro ao consultar artesanato.');
        }
        res.render('admin/artesanato/lista', { artesanato });
    });
});

//ROTA PARA EXIBIR O FORMULÁRIO DE CADASTRO DE PRODUTOS
appAdmin.get('/comida/form-cadastrar', exigirVendedor, (req, res) => {
    db.all(
        'SELECT * FROM categorias',
        [],
        function (erro, categorias) {
            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao consultar categorias.');
            }
            res.render('admin/comida/cadastro', { categorias });
        }      
    );
});

appAdmin.get('/artesanato/form-cadastrar', exigirVendedor, (req, res) => {
    db.all(
        'SELECT * FROM categorias',
        [],
        function (erro, categorias) {
            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao consultar categorias.');
            }

            res.render('admin/artesanato/cadastro', { categorias });
        }
    );
});

appAdmin.post('/comida/cadastrar', upload.single('imagem'), (req, res) => {
    const nome = req.body.nome;
    const categoria = req.body.categoria;
    const valor = req.body.valor;
    const estoque = req.body.estoque;
    const descricao = req.body.descricao;
    const validade = req.body.validade;
    const peso = req.body.peso;
    const destaque = req.body.destaque;
    const imagem = req.file ? req.file.filename : null; // Obtém o nome do arquivo enviado
    const id_vendedor = req.session.vendedor.id; 

    db.run(
         `INSERT INTO comida (nome, id_vendedor, categoria, valor, estoque, descricao, validade, peso, destaque, imagem) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [nome, id_vendedor, categoria, valor, estoque, descricao, validade, peso, destaque, imagem],
        function (erro) {
            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao cadastrar comida.');
            }
            res.redirect('/admin/comida');
        }
        
    );
});

appAdmin.post('/artesanato/cadastrar', upload.single('imagem'), (req, res) => {
    const nome = req.body.nome;
    const categoria = req.body.categoria;
    const valor = req.body.valor;
    const estoque = req.body.estoque;
    const peso = req.body.peso;
    const descricao = req.body.descricao;
    const destaque = req.body.destaque;
    const imagem = req.file ? req.file.filename : null; // Obtém o nome do arquivo enviado
    const id_vendedor = req.session.vendedor.id; 

    db.run(
         `INSERT INTO artesanato (nome, id_vendedor, categoria, valor, estoque, peso, descricao, destaque, imagem) VALUES (?,?,?,?,?,?,?,?,?)`,
        [nome, id_vendedor, categoria, valor, estoque, peso, descricao, destaque, imagem],
        function (erro) {
            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao cadastrar artesanato.');
            }
            res.redirect('/admin/artesanato');
        }
        
    );
});

//ACHA A TABELA E O PRODUTO PELO ID
appAdmin.get('/comida/form-editar/:id', exigirVendedor, (req, res) => {
    const id = req.params.id;
     const id_vendedor = req.session.vendedor.id;
    db.get(
        'SELECT * FROM comida WHERE id = ? and id_vendedor = ?',[id, id_vendedor], (erro, comida) => {
            if (erro) {
                console.log(erro.message);
                return res.status(500).send('Erro ao consultar comida.');
            }
            if (!comida) {
                return res.status(404).send('Comida não encontrada.');
            }
            db.all(
                'SELECT * FROM categorias',
                [],
                (erro, categorias) => {
                    if (erro) {
                        console.log(erro.message);
                        return res.status(500).send('Erro ao consultar categorias.');
                    }

                    res.render('admin/comida/editar', {comida,categorias});
                }
            );
        }
    );
});

//EDITAR COMIDA
appAdmin.post('/comida/editar/:id', upload.single('imagem'), (req, res) => {
    const id = req.params.id;
     const id_vendedor = req.session.vendedor.id;
    const { nome, categoria, valor, estoque, descricao, validade, peso, destaque } = req.body;
    const imagem = req.file ? req.file.filename : null;
    let sql;
    let dados;

    if (imagem) {
        sql = `
            UPDATE comida
            SET nome = ?, categoria = ?, valor = ?, estoque = ?, descricao = ?, validade = ?, peso = ?, destaque = ?, imagem = ?
            WHERE id = ? and id_vendedor = ?
        `;
        dados = [nome, categoria, valor, estoque, descricao, validade, peso, destaque, imagem, id, id_vendedor];
    } else {
        sql = `
            UPDATE comida
            SET nome = ?, categoria = ?, valor = ?, estoque = ?, descricao = ?, validade = ?, peso = ?, destaque = ?
            WHERE id = ? and id_vendedor = ?`;
        dados = [
            nome, categoria, valor, estoque, descricao, validade, peso, destaque, id, id_vendedor ];
    }

    db.run(sql, dados, function (erro) {
        if (erro) {
            console.log('Erro ao editar comida:', erro.message);
            return res.status(500).send('Erro ao editar comida.');
        }

        if (this.changes === 0) {
            console.log('Nenhum registro foi atualizado. ID:', id);
        }

        res.redirect('/admin/comida');
    });
});

//EXCLUIR COMIDA
appAdmin.post('/comida/excluir/:id', (req, res) => {

    const id = req.params.id;
     const id_vendedor = req.session.vendedor.id;
    db.run(
        'DELETE FROM comida WHERE id = ? and id_vendedor = ?', [id, id_vendedor],
        function (erro) {

            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao excluir comida.');
            }

            res.redirect('/admin/comida');
        }
    );

});


appAdmin.get('/artesanato/form-editar/:id', exigirVendedor, (req, res) => {
    const id = req.params.id;
     const id_vendedor = req.session.vendedor.id;
    db.get(
        'SELECT * FROM artesanato WHERE id = ? and id_vendedor = ?',[id, id_vendedor], (erro, artesanato) => {
            if (erro) {
                console.log(erro.message);
                return res.status(500).send('Erro ao consultar artesanato.');
            }
            if (!artesanato) {
                return res.status(404).send('Artesanato não encontrado.');
            }
            db.all(
                'SELECT * FROM categorias',
                [],
                (erro, categorias) => {
                    if (erro) {
                        console.log(erro.message);
                        return res.status(500).send('Erro ao consultar categorias.');
                    }

                    res.render('admin/artesanato/editar', {artesanato,categorias});
                }
            );
        }
    );
});

//comida
appAdmin.post('/artesanato/editar/:id', upload.single('imagem'), (req, res) => {
    const id = req.params.id;
     const id_vendedor = req.session.vendedor.id;
    const { nome, categoria, valor, estoque, descricao, destaque } = req.body;
    const imagem = req.file ? req.file.filename : null;
    let sql;
    let dados;

    if (imagem) {
        sql = `
            UPDATE artesanato
            SET nome = ?, categoria = ?, valor = ?, estoque = ?, descricao = ?, destaque = ?, imagem = ?
            WHERE id = ? and id_vendedor = ? `;
        dados = [nome, categoria, valor, estoque, descricao, destaque, imagem, id, id_vendedor];
    } else {
        sql = `
            UPDATE artesanato
            SET nome = ?, categoria = ?, valor = ?, estoque = ?, descricao = ?, destaque = ?
            WHERE id = ? and id_vendedor = ?`;
        dados = [
            nome, categoria, valor, estoque, descricao, destaque, id, id_vendedor ];
    }

    db.run(sql, dados, function (erro) {
        if (erro) {
            console.log('Erro ao editar artesanato:', erro.message);
            return res.status(500).send('Erro ao editar artesanato.');
        }

        if (this.changes === 0) {
            console.log('Nenhum registro foi atualizado. ID:', id);
        }

        res.redirect('/admin/artesanato');
    });
});

appAdmin.post('/artesanato/excluir/:id', (req, res) => {

    const id = req.params.id;
     const id_vendedor = req.session.vendedor.id;
    db.run(
        'DELETE FROM artesanato WHERE id = ? and id_vendedor = ?', [id, id_vendedor],
        function (erro) {

            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao excluir artesanato.');
            }

            res.redirect('/admin/artesanato');
        }
    );

});


//categoria
appAdmin.get('/categorias/form-editar/:id', exigirVendedor, (req, res) => {
    const id = req.params.id;

    db.get(
        'SELECT * FROM categorias WHERE id = ?',
        [id],
        function (erro, categoria) {
            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao consultar categoria.');
            }

            if (!categoria) {
                return res.status(404).send('Categoria não encontrada.');
            }

            res.render('admin/categorias/editar', { categoria });
        }
    );
});

//EDITAR 
appAdmin.post('/categorias/editar/:id', upload.single('imagem'), (req, res) => {
    const id = req.params.id;
    const { nome, descricao} = req.body;
    

    db.run( 
        'UPDATE Categorias SET nome = ?, descricao = ? WHERE id = ?',
        [nome, descricao, id],
        function (erro) {

        if (erro) {
            console.log( erro.message);
            return res.status(500).send('Erro ao editar categoria.');
        }


        res.redirect('/admin/categorias');
    });
});

//EXCLUIR COMIDA
appAdmin.post('/categorias/excluir/:id', (req, res) => {

    const id = req.params.id;

    db.run(
        'DELETE FROM categorias WHERE id = ?', [id],
        function (erro) {

            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao excluir categorias.');
            }

            res.redirect('/admin/categorias');
        }
    );

});

appAdmin.get('/perfil', exigirVendedor, (req, res) => {
    db.get(
        'SELECT * FROM vendedores WHERE id = ?',
        [req.session.vendedor.id],
        function (erro, vendedor) {
            if (erro || !vendedor) {
                console.log(erro ? erro.message : 'Vendedor não encontrado.');
                return res.redirect('/admin/login');
            }
            db.all('SELECT * FROM categorias', [], (erroCat, categorias) => {
                res.render('admin/perfil-vendedor', {
                    categorias: erroCat ? [] : categorias,
                    vendedor,
                    titulo: 'Meu Perfil - Vendedor'
                });
            });
        }
    );
});

appAdmin.get('/logout', (req, res) => {
    req.session.destroy(function () {
        res.redirect('/admin/login');
    });
});

appAdmin.get('/perfil/editar', exigirVendedor, (req, res) => {
    db.get(
        'SELECT * FROM vendedores WHERE id = ?',
        [req.session.vendedor.id],
        function (erro, vendedor) {
            if (erro || !vendedor) {
                return res.redirect('/admin/perfil');
            }
            
            db.all('SELECT * FROM categorias', [], (erroCat, categorias) => {
                res.render('admin/perfil-editar', {
                    categorias: erroCat ? [] : categorias,
                    vendedor,
                    titulo: 'Editar Perfil'
                });
            });
        }
    );
});

appAdmin.post('/perfil/editar', exigirVendedor, upload.single('foto'), (req, res) => {
    const id = req.session.vendedor.id;
    const { nome_empresa, nome_responsavel, email, endereco, cidade, telefone } = req.body;
    const foto = req.file ? req.file.filename : null;
    let sql;
    let dados;
    if (foto) {
        sql = `
            UPDATE vendedores 
            SET nome_empresa = ?, nome_responsavel = ?, email = ?, endereco = ?, cidade = ?, telefone = ?, foto = ? 
            WHERE id = ?
        `;
        dados = [nome_empresa, nome_responsavel, email, endereco, cidade, telefone, foto, id];
    } else {
        sql = `
            UPDATE vendedores 
            SET nome_empresa = ?, nome_responsavel = ?, email = ?, endereco = ?, cidade = ?, telefone = ? 
            WHERE id = ?
        `;
        dados = [nome_empresa, nome_responsavel, email, endereco, cidade, telefone, id];
    }

    db.run(sql, dados, function (erro) {
        if (erro) {
            console.log('Erro ao editar perfil:', erro.message);
            return res.status(500).send('Erro ao editar perfil.');
        }
        req.session.vendedor.empresa = nome_empresa;
        if (foto) {
            req.session.vendedor.foto = foto;
        }

        res.redirect('/admin/perfil');
    });
});

appAdmin.get('/perfil/senha', exigirVendedor, (req, res) => {
    db.all('SELECT * FROM categorias', [], (erroCat, categorias) => {
        res.render('admin/alterar-senha', {
            categorias: erroCat ? [] : categorias,
            titulo: 'Alterar Senha',
            erro: null
        });
    });
});

appAdmin.post('/perfil/senha', exigirVendedor, (req, res) => {
    const { nova_senha, confirmar_senha } = req.body;

    function mostrarErro(mensagem) {
        db.all('SELECT * FROM categorias', [], (erroCat, categorias) => {
            res.render('admin/alterar-senha', {
                categorias: erroCat ? [] : categorias,
                titulo: 'Alterar Senha',
                erro: mensagem
            });
        });
    }

    if (!nova_senha || !confirmar_senha) {
        return mostrarErro('Preencha todos os campos.');
    }
    if (nova_senha.length < 6) {
        return mostrarErro('A nova senha deve ter pelo menos 6 caracteres.');
    }
    if (nova_senha !== confirmar_senha) {
        return mostrarErro('As senhas não coincidem.');
    }

    const senhaHash = bcrypt.hashSync(nova_senha, 10);
    db.run(
        'UPDATE vendedores SET senha = ? WHERE id = ?',
        [senhaHash, req.session.vendedor.id],
        function (erro) {
            if (erro) {
                console.log('Erro ao alterar senha:', erro.message);
                return mostrarErro('Erro interno ao alterar a senha.');
            }
            res.redirect('/admin/perfil');
        }
    );
});

module.exports = appAdmin;