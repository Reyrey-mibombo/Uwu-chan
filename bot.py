import discord
from discord.ext import commands
import asyncio
import time

TOKEN = "MTQ2NTQ3Mjc3MDQxMzQyODc4Nw.GO17yX.St69HZFBt4WTvHW8KmGhLELDzRcY-Hms8TeY40"

ROLE_NAME = "Pic Perms"
STATUS_TRIGGER = "/Asclade"

# Simple bot
bot = commands.Bot(command_prefix="$", intents=discord.Intents.all(), help_command=None)

# Last command time cache
last_command = {}

@bot.event
async def on_ready():
    print(f"✅ {bot.user} online")
    await bot.change_presence(activity=discord.Game(name="$help"))

@bot.command()
async def help(ctx):
    """Instant response"""
    await ctx.send("**⚡ Bot Commands:**\n• $help\n• $checkme\n• $ping")

@bot.command()
async def checkme(ctx):
    """Instant check"""
    member = ctx.author
    
    # Ultra-fast check
    has = any(STATUS_TRIGGER in str(getattr(a, 'name', '')) for a in member.activities)
    role = discord.utils.get(ctx.guild.roles, name=ROLE_NAME)
    has_role = role in member.roles if role else False
    
    await ctx.send(f"✅ Status: {'YES' if has else 'NO'}\n✅ Role: {'YES' if has_role else 'NO'}")

@bot.command()
async def ping(ctx):
    """Instant ping"""
    await ctx.send(f"🏓 {round(bot.latency * 1000)}ms")

# Simple background check (non-blocking)
async def background_task():
    await bot.wait_until_ready()
    
    while not bot.is_closed():
        try:
            for guild in bot.guilds:
                role = discord.utils.get(guild.roles, name=ROLE_NAME)
                if not role:
                    try:
                        role = await guild.create_role(name=ROLE_NAME, color=discord.Color.blue())
                    except:
                        continue
                
                # Check only active members (online/idle/dnd)
                for member in guild.members:
                    if member.bot or member.status == discord.Status.offline:
                        continue
                    
                    # Quick check
                    has = any(STATUS_TRIGGER in str(getattr(a, 'name', '')) for a in member.activities)
                    has_role = role in member.roles
                    
                    if has and not has_role:
                        await member.add_roles(role)
                    elif not has and has_role:
                        await member.remove_roles(role)
                    
                    # Small delay to not block
                    await asyncio.sleep(0.05)
            
            # Wait 30 seconds between cycles
            await asyncio.sleep(30)
            
        except:
            await asyncio.sleep(5)

# Start background task
@bot.event
async def on_connect():
    bot.loop.create_task(background_task())

if __name__ == "__main__":
    print("🤖 Starting lightweight bot...")
    bot.run(TOKEN)
