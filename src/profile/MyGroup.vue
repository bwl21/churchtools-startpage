<script setup lang="ts">
import {
    ContentWrapper,
    LoadingDots,
    SectionedCard,
    Button,
} from '@churchtools/styleguide';
import {
    GroupMember,
    mapViz,
    queryClient,
    t,
    useToasts,
    useCurrentUser,
    usePermissions,
} from '@churchtools/utils';
import useGroup from '../composables/useGroup';
import { computed, onMounted, ref, toRef } from 'vue';
import { mdToHtml } from '../utils/helper';
import useGroupMemberfields from '../composables/useGroupMemberfields';
import useGroupMembers from '../composables/useGroupMembers';
import { sortBy } from 'lodash';
import {
    churchtoolsClient,
    errorHelper,
} from '@churchtools/churchtools-client';

const props = defineProps<{
    groupId: string;
}>();
const id = computed(() => parseInt(props.groupId));
const currentUser = useCurrentUser();
const { errorToast, successToast } = useToasts();
const { getGroup } = useGroup();
const { data: group, isLoading } = getGroup(id);
const { userAllowedInGroup } = usePermissions();

const { getMyMembership } = useGroupMembers(
    id,
    toRef(() => currentUser.person?.lastName)
);

const myMembership = ref<GroupMember>();
onMounted(async () => {
    myMembership.value = await getMyMembership();
});
const values = computed(() => {
    const fields = myMembership.value?.fields;
    return Object.fromEntries(
        fields?.map((field) => [
            field.name.replaceAll('.', '_'),
            field.value,
        ]) ?? []
    );
});

const name = computed(() => group.value?.name);
const note = computed(() => mdToHtml(group.value?.information.note));

const defaultValues = ['bitte wählen', 'bitte ausfüllen', 'eingeladen'];
const { fields: data } = useGroupMemberfields(id);
const fields = computed(
    () =>
        data.value.map((f) => ({
            ...f,
            key: f.key.replaceAll('.', '_'),
            nameTranslated: t(f.name, false),
            options: f.options.filter((o: any) => !defaultValues.includes(o.id)),
        })) ?? []
);

const items = computed(() => {
    const viz = mapViz({}, fields.value as any, values.value);

    const mapped = Object.values(viz ?? {}).map((item) => {
        return {
            type: 'key-value' as const,
            viz: item,
            bold: true,
            editable: userAllowedInGroup(
                id.value,
                'churchdb',
                '+edit own groupmemberfields',
                item.field.securityLevel
            ),
            context: name.value,
            onSave: async (e: any) => {
                // eslint-disable-next-line prefer-const
                let [key, values] = Object.entries(e)[0];
                const field = fields.value.find(
                    (f) => f.key === key.replaceAll('.', '_')
                );
                if (!field) return false;
                if (
                    [
                        'select',
                        'multiselect',
                        'radioselect',
                        'radioSelect',
                    ].includes(field?.fieldTypeCode)
                ) {
                    values ??= null;
                }

                const payload = { fields: { [field.id]: values } };
                const p = {
                    fields:
                        Array.isArray(payload.fields) || !payload.fields
                            ? Object.fromEntries(
                                  (payload.fields ?? [])?.map((f) => [
                                      f.id,
                                      Array.isArray(f.value)
                                          ? f.value.filter((v: any) => v)
                                          : f.value,
                                  ])
                              )
                            : payload.fields,
                };
                try {
                    const result = await churchtoolsClient.patch<GroupMember>(
                        `/groups/${props.groupId}/members/${currentUser.id}`,
                        p
                    );
                    myMembership.value = result;
                    queryClient.invalidateQueries({
                        queryKey: ['groups', id.value, 'members'],
                    });
                    successToast('Daten gespeichert');
                    return true;
                } catch (error) {
                    errorToast(errorHelper.getTranslatedErrorMessage(error));
                    return false;
                }
            },
        };
    });
    return sortBy(
        mapped.filter((item) => item.viz.field.useInRegistrationForm),
        (item) => item.viz.field.sortKey
    );
});
</script>
<template>
    <LoadingDots v-if="isLoading || !myMembership" class="mt-20" />
    <ContentWrapper
        v-else
        max-width
        :title="name"
        :breadcrumbs="[
            { title: 'Meine Anmeldung', to: { name: 'profile' } },
            { title: name || 'Gruppe' },
        ]"
    >
        <div
            v-if="note"
            class="markdown max-w-p text-secondary text-base"
            v-html="note"
        />
        <SectionedCard :items="items" />
        <Button
            class="self-start"
            icon="fas fa-arrow-left"
            text
            size="S"
            @click="() => $router.go(-1)"
            >Zurück</Button
        >
    </ContentWrapper>
</template>
