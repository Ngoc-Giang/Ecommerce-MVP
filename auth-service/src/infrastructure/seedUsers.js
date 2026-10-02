const { validateRegistration } = require("../domain/validation");
const { ROLES } = require("../domain/roles");

const SEEDS = [
    { prefix: "ADMIN", role: ROLES.ADMIN },
    { prefix: "STAFF", role: ROLES.SHIPMENT_STAFF }
];

const seedUsers = async ({ env, userRepository, passwordHasher, log = console }) => {
    for (const { prefix, role } of SEEDS) {
        const username = env[`${prefix}_USERNAME`];
        const password = env[`${prefix}_PASSWORD`];
        if (!username || !password) continue;

        const data = validateRegistration({
            username,
            password,
            email: env[`${prefix}_EMAIL`] || `${username}@example.local`
        });
        if (await userRepository.findByUsername(data.username)) continue;

        await userRepository.create({
            username: data.username,
            email: data.email,
            phone: null,
            passwordHash: await passwordHasher.hash(data.password),
            role
        });
        log.info(`Seeded ${role} account "${data.username}"`);
    }
};

module.exports = { seedUsers };