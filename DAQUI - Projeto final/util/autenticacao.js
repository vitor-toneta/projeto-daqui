// Protege rotas que exigem usuário logado
function exigirLogin(req, res, next) {
    if (!req.session.usuario) {
        req.session.destinoLogin = req.originalUrl;
        return res.redirect('/usuario/login');
    }
    next();
}

module.exports = { exigirLogin };
