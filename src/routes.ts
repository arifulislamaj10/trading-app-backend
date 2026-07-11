import { Router } from 'express';
import authRoute from './app/modules/auth/auth.route';
import userRoute from './app/modules/user/user.route';
import uploadRoute from './app/modules/upload.ts/upload.route';
import subscriptionRoute from './app/modules/subscription/subscription.route';
import signalRouter from './app/modules/signal/signal.route';
import { comment_routes } from './app/modules/signal/comment.route';
import masterRouter from './app/modules/master/master.route';
import followRouter from './app/modules/follow/follow.route';
import notificationRouter from './app/modules/notification/notification.route';
import adminRouter from './app/modules/admin/admin.route';
import contributionRouter from './app/modules/contribution/contribution.route';
import leaderboardRouter from './app/modules/leaderboard/leaderboard.route';
import topTradersRouter from './app/modules/top-traders/top_traders.route';
import copiedTradeRouter from './app/modules/copied_trade/copied_trade.route';
import { referral_routes } from './app/modules/referral/referral.route';
import { withdrawal_routes } from './app/modules/withdrawal/withdrawal.route';
import { wallet_transaction_routes } from './app/modules/wallet_transaction/wallet_transaction.route';
import { system_config_routes, public_config_routes } from './app/modules/system_config/system_config.route';
import badgeRouter from './app/modules/badge/badge.route';
import trainingRouter from './app/modules/training/training.route';

const appRouter = Router();

const moduleRoutes = [
    // Core modules
    { path: '/auth', route: authRoute },
    { path: '/user', route: userRoute },
    { path: '/upload', route: uploadRoute },
    { path: '/subscription', route: subscriptionRoute },
    { path: '/referrals', route: referral_routes },
    { path: '/withdrawals', route: withdrawal_routes },
    { path: '/transactions', route: wallet_transaction_routes },

    // Signal platform modules
    { path: '/signals', route: signalRouter },
    { path: '/comments', route: comment_routes },
    { path: '/masters', route: masterRouter },
    { path: '/follow', route: followRouter },
    { path: '/notifications', route: notificationRouter },

    // Copy trading & journal modules
    { path: '/copied-trades', route: copiedTradeRouter },
    { path: '/badges', route: badgeRouter },
    { path: '/training', route: trainingRouter },

    // Ranking & engagement modules
    { path: '/contributions', route: contributionRouter },
    { path: '/leaderboard', route: leaderboardRouter },
    { path: '/top-traders', route: topTradersRouter },

    // Admin module
    { path: '/admin', route: adminRouter },
    { path: '/admin/settings', route: system_config_routes },
    { path: '/config', route: public_config_routes },
];

moduleRoutes.forEach(route => appRouter.use(route.path, route.route));
export default appRouter;