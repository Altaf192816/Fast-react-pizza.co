import { Form, redirect, useActionData, useNavigation } from "react-router-dom";
import { createOrder } from "../../services/apiRestaurant";
import Button from "../../ui/Button";
import { useDispatch, useSelector } from "react-redux";
import { clearCart, getCart, getTotalCartPrice } from "../cart/cartSlice";
import store from "../../store";
import EmptyCart from "../cart/EmptyCart";
import { formatCurrency } from "../../utils/helpers";
import { useState } from "react";
import { fetchAddress } from "../user/userSlice";

// https://uibakery.io/regex-library/phone-number
const isValidPhone = (str) =>
  /^\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/.test(
    str
  );

// const fakeCart = [
//   {
//     pizzaId: 12,
//     name: "Mediterranean",
//     quantity: 2,
//     unitPrice: 16,
//     totalPrice: 32,
//   },
//   {
//     pizzaId: 6,
//     name: "Vegetale",
//     quantity: 1,
//     unitPrice: 13,
//     totalPrice: 13,
//   },
//   {
//     pizzaId: 11,
//     name: "Spinach and Mushroom",
//     quantity: 1,
//     unitPrice: 15,
//     totalPrice: 15,
//   },
// ];

function CreateOrder() {
  const [withPriority, setWithPriority] = useState(false);
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const formErrors = useActionData();
  const {
    username,
    status: addressStatus,
    position,
    address,
    error: addressError,
  } = useSelector((store) => store.user);
  const isLoadingAddress = addressStatus === "loading";

  const cart = useSelector(getCart); //redux would call this useSelector function do  not call getCart() manually
  const totalCartPrice = useSelector(getTotalCartPrice);
  const priorityPrice = withPriority ? totalCartPrice * 0.2 : 0;
  const totalPrice = totalCartPrice + priorityPrice;
  const dispatch = useDispatch();
  if (!cart.length) return <EmptyCart />;

  return (
    <div className="px-4 py-4">
      <h2 className="mb-8 text-xl font-semibold">Ready to order? Lets go!</h2>

      {/* <Form method="POST" action="/order/new"> */}
      <Form method="POST">
        <div className="flex flex-col gap-2 mb-5 sm:flex-row sm:items-center">
          <label className="sm:basis-40">First Name</label>
          <input
            type="text"
            name="customer"
            required
            className="input grow"
            defaultValue={username}
          />
        </div>

        <div className="flex flex-col gap-2 mb-5 sm:flex-row sm:items-center">
          <label className="sm:basis-40">Phone number</label>
          <div className="grow">
            <input type="tel" name="phone" required className="w-full input" />
            {formErrors?.phone && (
              <p className="p-2 mt-2 text-xs text-red-700 bg-red-100 rounded-md">
                {formErrors.phone}
              </p>
            )}
          </div>
        </div>

        <div className="relative flex flex-col gap-2 mb-5 sm:flex-row sm:items-center">
          <label className="sm:basis-40">Address</label>
          <div className="grow">
            <input
              className="w-full input"
              type="text"
              name="address"
              disabled={isLoadingAddress}
              defaultValue={address}
              required
            />
            {addressStatus === "error" && (
              <p className="p-2 mt-2 text-xs text-red-700 bg-red-100 rounded-md">
                {addressError}
              </p>
            )}
          </div>

          {!position.latitude && !position.longitude && (
            <span className="absolute z-10 x ">
              <Button
                disabled={isLoadingAddress}
                type={"small"}
                onClick={(e) => {
                  e.preventDefault();
                  dispatch(fetchAddress());
                }}
              >
                get position
              </Button>
            </span>
          )}
        </div>

        <div className="flex items-center gap-5 mb-12">
          <input
            className="w-6 h-6 accent-stone-300 focus:ring focus:ring-stone-400 focus:ring-offset-2"
            type="checkbox"
            name="priority"
            id="priority"
            value={withPriority}
            onChange={(e) => setWithPriority(e.target.checked)}
          />
          <label className="font-medium" htmlFor="priority">
            Want to yo give your order priority?
          </label>
        </div>

        <div>
          <input type="hidden" name="cart" value={JSON.stringify(cart)} />
          <input
            type="hidden"
            name="position"
            value={
              position.latitude && position.longitude
                ? `${position.latitude},${position.longitude}`
                : ""
            }
          />
          <Button disabled={isSubmitting || isLoadingAddress} type="primary">
            {isSubmitting
              ? "Placing order..."
              : `Order now for ${formatCurrency(totalPrice)} `}
          </Button>
        </div>
      </Form>
    </div>
  );
}

//action--->mutating,deleting and updating data on server(setup is similar to loader)
export async function action({ request }) {
  const formData = await request.formData();
  const data = Object.fromEntries(formData);

  const order = {
    ...data,
    cart: JSON.parse(data.cart),
    priority: data.priority === "true",
  };

  //handling phone number error
  const errors = {};
  if (!isValidPhone(order.phone))
    errors.phone =
      "Please give your correct number.We might need to cantact you";
  if (Object.keys(errors).length > 0) return errors;

  //dont overuse this
  store.dispatch(clearCart());

  //if everything okay create new order and redirect
  const newOrder = await createOrder(order);
  return redirect(`/order/${newOrder.id}`);
}

export default CreateOrder;
