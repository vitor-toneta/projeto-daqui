const express = require('express');
const bcrypt = require('bcryptjs');
const appUsuario = express();
const db = require('../banco/database');
const { exigirLogin } = require('../util/autenticacao');
const upload = require('../util/imagens');
const FORMAS_PAGAMENTO = ['pix', 'credito', 'debito', 'boleto'];

// Monta o menu (categorias) usado pelo topo do site
function carregarMenu(res, callback) {
    db.all('SELECT * FROM categorias', [], function (erro, categorias) {
        if (erro) {
            console.log(erro.message);
            return res.status(500).send('Erro ao consultar categorias.');
        }
        callback(categorias);
    });
}

//================= CADASTRO =====================

appUsuario.get('/cadastro', (req, res) => {
    carregarMenu(res, (categorias) => {
        res.render('usuario/cadastro', {
            categorias,
            titulo: 'Criar conta',
            erro: null,
            valores: {}
        });
    });
});

appUsuario.post('/cadastro', upload.single('foto'), (req, res) => {
    const nome = (req.body.nome || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const cpfDigitado = req.body.cpf || '';
    const cpf = cpfDigitado.replace(/\D/g, '');
    const senha = req.body.senha || '';
    const endereco = (req.body.endereco || '').trim();
    const cidade = (req.body.cidade || '').trim();
    const telefone = (req.body.telefone || '').trim();
    const foto = req.file ? req.file.filename : null;

    function mostrarErro(mensagem) {
        carregarMenu(res, (categorias) => {
            res.render('usuario/cadastro', {
                categorias,
                titulo: 'Criar conta',
                erro: mensagem,
                // Devolve os valores (inclusive os novos) para o form não apagar
                valores: { nome, email, cpf: cpfDigitado, endereco, cidade, telefone }
            });
        });
    }
    if (!nome || !email || !senha || !endereco || !cidade || !telefone) {
        return mostrarErro('Preencha todos os campos obrigatórios.');
    }

    if (senha.length < 6) {
        return mostrarErro('A senha deve ter pelo menos 6 caracteres.');
    }
    const senhaHash = bcrypt.hashSync(senha, 10);
    db.run(
        'INSERT INTO usuarios (nome, email, cpf, senha, endereco, cidade, telefone, foto) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [nome, email, cpf, senhaHash, endereco, cidade, telefone, foto],
        function (erro) {
            if (erro) {
                console.log(erro.message);
                if (erro.message.includes('usuarios.email')) {
                    return mostrarErro('Este e-mail já está cadastrado.');
                }
                if (erro.message.includes('usuarios.cpf')) {
                    return mostrarErro('Este CPF já está cadastrado.');
                }
                return mostrarErro('Erro ao cadastrar usuário.');
            }
            res.redirect('/usuario/login?cadastro=ok');
        }
    );
});

//================= LOGIN / LOGOUT =====================

appUsuario.get('/login', (req, res) => {
    if (req.session.usuario) {
        return res.redirect('/usuario/perfil');
    }
    if (req.query.destino === 'compra') {
        req.session.destinoLogin = '/usuario/compra/confirmacao';
    } else if (!req.session.destinoLogin) {
        req.session.destinoLogin = '/usuario/perfil';
    }
    // Se destinoLogin já tem valor (do exigirLogin), NÃO mexe
    carregarMenu(res, (categorias) => {
        res.render('usuario/login', {
            categorias,
            titulo: 'Entrar',
            erro: null,
            sucesso: req.query.cadastro === 'ok',
            email: ''
        });
    });
});

appUsuario.post('/login', (req, res) => {
    const email = (req.body.email || '').trim().toLowerCase();
    const senha = req.body.senha || '';

    function mostrarErro(mensagem) {
        carregarMenu(res, (categorias) => {
            res.render('usuario/login', {
                categorias,
                titulo: 'Entrar',
                erro: mensagem,
                sucesso: false,
                email
            });
        });
    }
    db.get('SELECT * FROM usuarios WHERE email = ?', [email], function (erro, usuario) {
        if (erro) {
            console.log(erro.message);
            return mostrarErro('Erro ao consultar usuário.');
        }
        if (!usuario || !bcrypt.compareSync(senha, usuario.senha)) {
            return mostrarErro('E-mail ou senha inválidos.');
        }
        const destino = req.session.destinoLogin || '/';
        delete req.session.destinoLogin;
        const carrinho = req.session.carrinho;
        const total = req.session.total;

        req.session.regenerate(function (erro) {
            if (erro) return mostrarErro('Erro ao iniciar sessão.');
            
            req.session.usuario = { id: usuario.id, nome: usuario.nome, foto: usuario.foto };
            req.session.carrinho = carrinho;
            req.session.total = total;
            
            req.session.save(function (erro) {
                if (erro) return res.status(500).send('Erro ao salvar sessão.');
                res.redirect(destino);
            });
        });
    });
});

appUsuario.get('/logout', (req, res) => {
    req.session.destroy(function () {
        res.redirect('/');
    });
});

//================= CONFIRMAÇÃO DA COMPRA =====================

appUsuario.get('/compra/confirmacao', exigirLogin, (req, res) => {
    db.get(
        'SELECT id, nome, email, cpf, foto FROM usuarios WHERE id = ?',
        [req.session.usuario.id],
        function (erro, usuario) {
            if (erro || !usuario) {
                console.log(erro ? erro.message : 'Usuário não encontrado.');
                return res.redirect('/usuario/login');
            }

            const total = req.session.total || 0; // Recupera o total final da sessão, ou 0 se não estiver definido            

            carregarMenu(res, (categorias) => {
                res.render('usuario/confirmacao', {
                    categorias,
                    titulo: 'Confirmação da compra',
                    usuario,
                    total
                });
            });
        }
    );
});

// Provisório: próxima etapa será gravar o pedido
appUsuario.post('/compra/finalizar', exigirLogin, (req, res) => {

    carregarMenu(res, (categorias) => {
        res.render('usuario/finalizacao', {
            categorias,
            titulo: 'Compra finalizada'
        });
    });
});

appUsuario.get('/perfil', exigirLogin, (req, res) => {
    db.get(
        'SELECT id, nome, email, cpf, endereco, cidade, telefone, foto FROM usuarios WHERE id = ?',
        [req.session.usuario.id],
        function (erro, usuario) {
            if (erro || !usuario) {
                return res.redirect('/usuario/login');
            }
            carregarMenu(res, (categorias) => {
                res.render('usuario/perfil-cliente', {
                    categorias,
                    titulo: 'Meu perfil',
                    usuario
                });
            });
        }
    );
});

// ================== EDITAR PERFIL ==================

// Rota para exibir o formulário de edição
appUsuario.get('/perfil/editar', exigirLogin, (req, res) => {
    db.get(
        'SELECT * FROM usuarios WHERE id = ?',
        [req.session.usuario.id],
        function (erro, usuario) {
            if (erro || !usuario) {
                console.log(erro ? erro.message : 'Usuário não encontrado.');
                return res.redirect('/usuario/perfil');
            }

            carregarMenu(res, (categorias) => {
                res.render('usuario/perfil-editar', {
                    categorias,
                    titulo: 'Editar Perfil',
                    usuario
                });
            });
        }
    );
});

// Rota para salvar as alterações
appUsuario.post('/perfil/editar', exigirLogin, upload.single('foto'), (req, res) => {
    const id = req.session.usuario.id;
    const { nome, email, endereco, cidade, telefone } = req.body;
    // Verifica se uma nova foto foi enviada
    const foto = req.file ? req.file.filename : null;
    let sql;
    let dados;
    if (foto) {
        sql = `
            UPDATE usuarios 
            SET nome = ?, email = ?, endereco = ?, cidade = ?, telefone = ?, foto = ? 
            WHERE id = ?
        `;
        dados = [nome, email, endereco, cidade, telefone, foto, id];
    } else {
        // Se não enviou foto, atualiza tudo MENOS a foto
        sql = `
            UPDATE usuarios 
            SET nome = ?, email = ?, endereco = ?, cidade = ?, telefone = ? 
            WHERE id = ?
        `;
        dados = [nome, email, endereco, cidade, telefone, id];
    }

    db.run(sql, dados, function (erro) {
        if (erro) {
            console.log('Erro ao editar perfil:', erro.message);
            return res.status(500).send('Erro ao editar perfil.');
        }
        // Atualizar o nome na sessão para o menu do topo atualizar na hora
        req.session.usuario.nome = nome;
        if (foto) {
            req.session.usuario.foto = foto;
        }

        res.redirect('/usuario/perfil');
    });
});

// ================== ALTERAR SENHA ==================

appUsuario.get('/perfil/senha', exigirLogin, (req, res) => {
    carregarMenu(res, (categorias) => {
        res.render('usuario/alterar-senha', {
            categorias,
            titulo: 'Alterar Senha',
            erro: null
        });
    });
});

appUsuario.post('/perfil/senha', exigirLogin, (req, res) => {
    const { nova_senha, confirmar_senha } = req.body;

    function mostrarErro(mensagem) {
        carregarMenu(res, (categorias) => {
            res.render('usuario/alterar-senha', {
                categorias,
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
    // Criptografa a nova senha
    const senhaHash = bcrypt.hashSync(nova_senha, 10);
    db.run(
        'UPDATE usuarios SET senha = ? WHERE id = ?',
        [senhaHash, req.session.usuario.id],
        function (erro) {
            if (erro) {
                console.log('Erro ao alterar senha:', erro.message);
                return mostrarErro('Erro interno ao alterar a senha.');
            }
            res.redirect('/usuario/perfil?senha_alterada=ok');
        }
    );
});

appUsuario.get('/cadastro-vendedor', (req, res) => {
    carregarMenu(res, (categorias) => {
        res.render('usuario/cadastro-vendedor', {
            categorias,
            titulo: 'Criar conta de Vendedor',
            erro: null,
            valores: {}
        });
    });
});

appUsuario.post('/cadastro-vendedor', upload.single('foto'), (req, res) => {
    const nome_empresa = (req.body.nome_empresa || '').trim();
    const nome_responsavel = (req.body.nome_responsavel || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const cpfDigitado = req.body.cpf || '';
    const cpf = cpfDigitado.replace(/\D/g, '');
    const senha = req.body.senha || '';
    const endereco = (req.body.endereco || '').trim();
    const cidade = (req.body.cidade || '').trim();
    const telefone = (req.body.telefone || '').trim();
    const foto = req.file ? req.file.filename : null;

    function mostrarErro(mensagem) {
        carregarMenu(res, (categorias) => {
            res.render('usuario/cadastro-vendedor', {
                categorias,
                titulo: 'Criar conta de Vendedor',
                erro: mensagem,
                valores: { nome_empresa, nome_responsavel, email, cpf: cpfDigitado, endereco, cidade, telefone }
            });
        });
    }

    if (!nome_empresa || !nome_responsavel || !email || !senha || !endereco || !cidade || !telefone) {
        return mostrarErro('Preencha todos os campos obrigatórios.');
    }
    if (senha.length < 6) {
        return mostrarErro('A senha deve ter pelo menos 6 caracteres.');
    }
    const senhaHash = bcrypt.hashSync(senha, 10);

    db.run(
        'INSERT INTO vendedores (nome_empresa, nome_responsavel, email, cpf, senha, endereco, cidade, telefone, foto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [nome_empresa, nome_responsavel, email, cpf, senhaHash, endereco, cidade, telefone, foto],
        function (erro) {
            if (erro) {
                console.log(erro.message);
                if (erro.message.includes('vendedores.email')) {
                    return mostrarErro('Este e-mail já está cadastrado.');
                }
                if (erro.message.includes('vendedores.cpf')) {
                    return mostrarErro('Este CPF já está cadastrado.');
                }
                return mostrarErro('Erro ao cadastrar vendedor.');
            }
            res.redirect('/admin/login?cadastro=ok');
        }
    );
});


module.exports = appUsuario;
