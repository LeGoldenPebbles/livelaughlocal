import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Article from '@/models/Article';
import { getStripe } from '@/lib/featuredStripe';

// Stripe Checkout success return for featured placements (mode:'setup').
// Stores the saved payment method on the article so the admin approval can
// charge it off-session later. Replay-safe: re-running the same session just
// overwrites the same value.
export async function GET(request) {
  const redirect = (query) =>
    NextResponse.redirect(new URL('/submit/thanks' + query, request.url));

  try {
    const stripe = getStripe();
    if (!stripe) return redirect('');

    const sessionId = new URL(request.url).searchParams.get('session_id');
    if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 200) {
      return redirect('?featured=error');
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['setup_intent'],
    });

    const slug = session && session.metadata && session.metadata.slug;
    let paymentMethod =
      session && session.setup_intent && session.setup_intent.payment_method;
    if (paymentMethod && typeof paymentMethod === 'object') {
      paymentMethod = paymentMethod.id;
    }
    if (!slug || !paymentMethod || typeof paymentMethod !== 'string') {
      return redirect('?featured=error');
    }

    await dbConnect();
    const article = await Article.findOne({ slug });
    if (!article) return redirect('?featured=error');

    article.stripe.paymentMethodId = paymentMethod;
    await article.save();

    return redirect('?featured=1');
  } catch (err) {
    console.error('[featured/confirm] failed:', err);
    return redirect('?featured=error');
  }
}
