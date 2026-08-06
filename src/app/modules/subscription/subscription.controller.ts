import { Request, Response } from "express";
import catchAsync from "../../utils/catch_async";
import manageResponse from "../../utils/manage_response";
import httpStatus from "http-status";
import { subscription_services } from "./subscription.service";

const get_all_plans = catchAsync(async (req: Request, res: Response) => {
  const plans = await subscription_services.get_all_plans();

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Subscription plans retrieved successfully",
    data: plans,
  });
});

const create_checkout_session = catchAsync(
  async (req: Request, res: Response) => {
    const { planId, returnUrl } = req.body;
    const user = req.user!;

    const result = await subscription_services.create_checkout_session(
      user.userId,
      planId,
      returnUrl,
    );

    manageResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Checkout session created successfully",
      data: result,
    });
  },
);

const get_current_subscription = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user!;

    const result = await subscription_services.get_current_subscription(
      user.userId,
    );

    manageResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Subscription details retrieved successfully",
      data: result,
    });
  },
);

const update_subscription_status = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user!;
    const { action } = req.body;

    if (!action || !["cancel", "resume"].includes(action)) {
      manageResponse(res, {
        success: false,
        statusCode: httpStatus.BAD_REQUEST,
        message: "Action is required. Use 'cancel' or 'resume'",
        data: null,
      });
      return;
    }

    const result = await subscription_services.update_subscription_status(
      user.userId,
      action,
    );

    manageResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: result.message,
      data: {
        currentPeriodEnd: result.currentPeriodEnd,
        nextBillingDate: result.nextBillingDate,
      },
    });
  },
);

const cancel_subscription = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await subscription_services.cancel_subscription(user.userId);

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result.message,
    data: { currentPeriodEnd: result.currentPeriodEnd },
  });
});

const resume_subscription = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await subscription_services.resume_subscription(user.userId);

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result.message,
    data: { nextBillingDate: result.nextBillingDate },
  });
});

const change_subscription_plan = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user!;
    const { planId, direction } = req.body;

    if (!planId) {
      manageResponse(res, {
        success: false,
        statusCode: httpStatus.BAD_REQUEST,
        message: "planId is required",
        data: null,
      });
      return;
    }

    const result = await subscription_services.change_subscription_plan(
      user.userId,
      planId,
      direction,
    );

    manageResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: result.message,
      data: {
        newPlan: result.newPlan,
        direction: result.direction,
        prorated: result.prorated,
        effectiveDate: result.effectiveDate,
      },
    });
  },
);

const create_billing_portal = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user!;
    const { returnUrl } = req.body;

    const result = await subscription_services.create_billing_portal(
      user.userId,
      returnUrl,
    );

    manageResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Billing portal session created",
      data: result,
    });
  },
);

// Backward-compatible wrappers (deprecated — use change_subscription_plan instead)
const upgrade_subscription = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const { planId } = req.body;
  const result = await subscription_services.change_subscription_plan(
    user.userId,
    planId,
    "upgrade",
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result.message,
    data: { newPlan: result.newPlan, prorated: result.prorated },
  });
});

const downgrade_subscription = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user!;
    const { planId } = req.body;
    const result = await subscription_services.change_subscription_plan(
      user.userId,
      planId,
      "downgrade",
    );

    manageResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: result.message,
      data: { newPlan: result.newPlan, effectiveDate: result.effectiveDate },
    });
  },
);

const get_payment_history = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const { page = 1, limit = 10 } = req.query;

  const result = await subscription_services.get_payment_history(
    user.userId,
    Number(page),
    Number(limit),
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Payment history retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const get_subscription_usage = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user!;

    const result = await subscription_services.get_subscription_usage(
      user.userId,
    );

    manageResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Subscription usage retrieved successfully",
      data: result,
    });
  },
);

export const subscription_controllers = {
  get_all_plans,
  create_checkout_session,
  get_current_subscription,
  update_subscription_status,
  cancel_subscription,
  resume_subscription,
  change_subscription_plan,
  upgrade_subscription,
  downgrade_subscription,
  create_billing_portal,
  get_payment_history,
  get_subscription_usage,
};
