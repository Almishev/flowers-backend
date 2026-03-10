import NextAuth, {getServerSession} from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import FacebookProvider from 'next-auth/providers/facebook'
import {MongoDBAdapter} from "@next-auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import {mongooseConnect} from "@/lib/mongoose";
import {Admin} from "@/models/Admin";

export const authOptions = {
  secret: process.env.SECRET,
  // Set the base URL for NextAuth - взима се от .env
  ...(process.env.NEXTAUTH_URL && { url: process.env.NEXTAUTH_URL }),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID?.trim(),
      clientSecret: process.env.GOOGLE_SECRET?.trim()
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_ID,
      clientSecret: process.env.FACEBOOK_SECRET,
      authorization: {
        params: {
          scope: 'public_profile email'
        }
      },
      profile(profile) {
        // Нормализиране на Facebook профила към NextAuth полета
        // Email ще е наличен само ако потребителят има валиден email и е дал разрешение
        return {
          id: profile.id,
          name: profile.name,
          email: profile.email ?? null,
          image: profile.picture?.data?.url ?? null,
        }
      },
    }),
  ],
  adapter: MongoDBAdapter(clientPromise),
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('SignIn callback:', user.email, account?.provider);
      // За Facebook понякога няма email -> откажи достъпа ако няма email, защото админ логиката разчита на него
      if (account?.provider === 'facebook' && !user?.email) {
        console.warn('Facebook sign-in blocked: missing email permission');
        return false;
      }
      return true;
    },
    async session({ session, token, user }) {
      console.log('Session callback - User email:', session?.user?.email);
      
      try {
        await mongooseConnect();
        
        // Проверяваме дали user-ът е в admins колекцията
        const adminEmails = await Admin.find().select('email');
        const adminEmailList = adminEmails.map(admin => admin.email);
        
        console.log('Admin emails from DB:', adminEmailList);
        const isAdmin = adminEmailList.includes(session?.user?.email);
        console.log('Is admin:', isAdmin);
        
        // Добавяме isAdmin флаг в сесията, вместо да връщаме false
        return {
          ...session,
          user: {
            ...session.user,
            isAdmin: isAdmin
          }
        };
      } catch (error) {
        console.error('Error checking admin status:', error);
        // При грешка все пак връщаме сесията, но без isAdmin флаг
        return {
          ...session,
          user: {
            ...session.user,
            isAdmin: false
          }
        };
      }
    },
    async redirect({ url, baseUrl }) {
      // Използвай NEXTAUTH_URL от .env или baseUrl (който NextAuth автоматично определя от request-а)
      const backendBaseUrl = process.env.NEXTAUTH_URL || baseUrl;
      
      // Ако URL-ът е относителен път, добави baseUrl
      if (url.startsWith('/')) {
        return `${backendBaseUrl}${url}`;
      }
      
      // Ако URL-ът е пълен, провери дали е от бекенда
      try {
        const urlObj = new URL(url);
        const backendUrlObj = new URL(backendBaseUrl);
        
        // Ако е от същия домейн и порт като бекенда, позволи го
        if (urlObj.origin === backendUrlObj.origin) {
          return url;
        }
        
        // Ако е от друг домейн/порт, пренасочи към бекенда
        return backendBaseUrl;
      } catch (e) {
        // При грешка, пренасочи към бекенда
        return backendBaseUrl;
      }
    },
  },
  pages: {
    signIn: '/api/auth/signin',
    error: '/api/auth/error',
  },
  debug: true,
};

export default NextAuth(authOptions);

export async function isAdminRequest(req,res) {
  const session = await getServerSession(req,res,authOptions);
  
  try {
    await mongooseConnect();
    const adminEmails = await Admin.find().select('email');
    const adminEmailList = adminEmails.map(admin => admin.email);
    
    if (!adminEmailList.includes(session?.user?.email)) {
      res.status(401);
      res.end();
      throw 'not an admin';
    }
  } catch (error) {
    console.error('Error checking admin status:', error);
    res.status(401);
    res.end();
    throw 'not an admin';
  }
}
