const express = require('express');
const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActivityType, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    REST, 
    Routes, 
    SlashCommandBuilder 
} = require('discord.js');
require('dotenv').config();

// ==================== EXPRESS SERVER FOR HEALTHCHECK ====================
const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint
app.get('/', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        message: 'Bot is running',
        timestamp: new Date().toISOString()
    });
});

// Keep-alive endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy',
        bot: client?.user?.tag || 'starting...'
    });
});

app.listen(PORT, () => {
    console.log(`✅ Healthcheck server running on port ${PORT}`);
});

// ==================== BOT CONFIGURATION ====================
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OWNER_ID = process.env.OWNER_ID;

// ==================== PIC PERMS CONFIG ====================
const ROLE_NAME = "Pic Perms";
const STATUS_TRIGGER = "/Asclade";
const CHECK_INTERVAL = 10000; // 10 seconds
const roleCache = new Map();

// ==================== STAFF POSITIONS ====================
const STAFF_POSITIONS = {
    "Manager": { 
        limit: 1, 
        color: 0xFF0000, 
        emoji: "👑",
        questions: [
            "1. Why should you be Manager? (List qualifications)",
            "2. What specific changes would you implement?",
            "3. How would you handle staff conflicts?",
            "4. Describe your vision for server growth",
            "5. What is your daily availability?",
            "6. Share your leadership experience",
            "7. Final message: Why choose you?"
        ]
    },
    // ... (keep all your other positions here - I shortened for clarity)
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences
    ]
});

// Storage
const userApplications = new Map();
const pendingApplications = new Map();
const logChannels = new Map();

// ==================== ERROR HANDLING ====================
process.on('unhandledRejection', (error) => {
    console.error('⚠️ Unhandled Promise Rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('⚠️ Uncaught Exception:', error);
});

// ==================== BOT READY ====================
client.once('ready', async () => {
    console.log(`✅ ${client.user.tag} is online!`);
    console.log(`📋 Staff Application System Active`);
    console.log(`🎯 Pic Perms System Active - Looking for: "${STATUS_TRIGGER}"`);
    
    // Register commands
    const commands = [
        new SlashCommandBuilder()
            .setName('apply')
            .setDescription('Apply for staff position'),
        
        new SlashCommandBuilder()
            .setName('positions')
            .setDescription('View all staff positions'),
        
        new SlashCommandBuilder()
            .setName('logging')
            .setDescription('Set log channel (Owner only)')
            .addChannelOption(option => 
                option.setName('channel')
                    .setDescription('Where applications go')
                    .setRequired(true)),
        
        new SlashCommandBuilder()
            .setName('test')
            .setDescription('Test bot connection'),
        
        new SlashCommandBuilder()
            .setName('checkme')
            .setDescription('Check your Pic Perms status'),
        
        new SlashCommandBuilder()
            .setName('help')
            .setDescription('Show help menu')
    ];
    
    try {
        const rest = new REST({ version: '10' }).setToken(TOKEN);
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('✅ Commands registered!');
    } catch (error) {
        console.error('❌ Command error:', error);
    }
    
    // Start Pic Perms checker
    startStatusChecker();
    
    client.user.setActivity({
        name: '/apply for staff | $checkme',
        type: ActivityType.Watching
    });
});

// ==================== PIC PERMS FUNCTIONS ====================
function checkUserStatus(member) {
    if (!member || !member.presence) return false;
    
    const customStatus = member.presence.activities.find(a => a.type === 4);
    if (customStatus && customStatus.state && customStatus.state.includes(STATUS_TRIGGER)) {
        return true;
    }
    
    for (const activity of member.presence.activities) {
        if (
            (activity.name && activity.name.includes(STATUS_TRIGGER)) ||
            (activity.state && activity.state.includes(STATUS_TRIGGER)) ||
            (activity.details && activity.details.includes(STATUS_TRIGGER))
        ) {
            return true;
        }
    }
    
    return false;
}

async function getPicRole(guild) {
    if (roleCache.has(guild.id)) {
        return roleCache.get(guild.id);
    }
    
    const role = guild.roles.cache.find(r => r.name === ROLE_NAME);
    
    if (role) {
        roleCache.set(guild.id, role);
        return role;
    }
    
    console.log(`❌ Could not find '${ROLE_NAME}' role in ${guild.name}`);
    return null;
}

function startStatusChecker() {
    setInterval(async () => {
        try {
            for (const guild of client.guilds.cache.values()) {
                const picRole = await getPicRole(guild);
                if (!picRole) continue;
                
                await guild.members.fetch();
                
                for (const member of guild.members.cache.values()) {
                    if (member.user.bot) continue;
                    
                    const hasTrigger = checkUserStatus(member);
                    const hasRole = member.roles.cache.has(picRole.id);
                    
                    try {
                        if (hasTrigger && !hasRole) {
                            await member.roles.add(picRole);
                        } else if (!hasTrigger && hasRole) {
                            await member.roles.remove(picRole);
                        }
                    } catch (error) {
                        console.error(`❌ Error with ${member.user.tag}:`, error.message);
                    }
                }
            }
        } catch (error) {
            console.error('Error in status checker:', error);
        }
    }, CHECK_INTERVAL);
}

// ==================== SLASH COMMAND HANDLER ====================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;
    
    if (interaction.commandName === 'test') {
        await interaction.reply({ 
            content: '✅ Bot is working! Healthcheck passed.', 
            ephemeral: true 
        });
    }
    else if (interaction.commandName === 'checkme') {
        const member = interaction.member;
        const picRole = await getPicRole(interaction.guild);
        const hasTrigger = checkUserStatus(member);
        const hasRole = picRole ? member.roles.cache.has(picRole.id) : false;
        
        const embed = new EmbedBuilder()
            .setTitle(`🔍 Pic Perms Check for ${member.user.username}`)
            .setColor(hasTrigger ? 0x00FF00 : 0xFF0000);
        
        embed.addFields({
            name: '✅ Status Check',
            value: `Looking for \`${STATUS_TRIGGER}\`: **${hasTrigger ? 'FOUND!' : 'NOT FOUND'}**`,
            inline: false
        });
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
});

// ==================== LOGIN ====================
console.log('🚀 Starting bot...');

client.login(TOKEN).catch(error => {
    console.error('❌ Login failed:', error);
    process.exit(1);
});

// Keep-alive ping every 5 minutes
setInterval(() => {
    console.log('❤️ Bot heartbeat:', new Date().toISOString());
}, 300000);
